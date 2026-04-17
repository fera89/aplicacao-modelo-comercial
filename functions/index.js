const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const { OpenAI } = require("openai");
const pdfParse = require("pdf-parse");

admin.initializeApp();
const db = admin.firestore();

// OpenAI Configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});


/**
 * Sends push notifications via the Expo Push API.
 * @param {string[]} tokens - Array of ExpoPushTokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional data payload
 */
async function sendExpoPush(tokens, title, body, data = {}) {
    // Filter only valid ExpoPushTokens
    const validTokens = tokens.filter(t => t && t.startsWith("ExponentPushToken["));

    if (validTokens.length === 0) {
        console.log("No valid Expo push tokens to send to.");
        return { sent: 0, errors: [] };
    }

    // Expo Push API supports batches of 100
    const messages = validTokens.map(token => ({
        to: token,
        sound: "default",
        title,
        body,
        data,
    }));

    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
        chunks.push(messages.slice(i, i + 100));
    }

    let totalSent = 0;
    const errors = [];

    for (const chunk of chunks) {
        try {
            const response = await fetch("https://exp.host/--/api/v2/push/send", {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Accept-encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(chunk),
            });

            const result = await response.json();
            if (result.data) {
                result.data.forEach((item, index) => {
                    if (item.status === "ok") {
                        totalSent++;
                    } else {
                        errors.push({ token: chunk[index].to, error: item.message });
                    }
                });
            }
        } catch (error) {
            console.error("Expo Push API error:", error);
            errors.push({ error: error.message });
        }
    }

    console.log(`Push sent: ${totalSent}/${validTokens.length}, errors: ${errors.length}`);
    return { sent: totalSent, errors };
}

/**
 * Collects all ExpoPushTokens from the users collection.
 */
async function getAllPushTokens() {
    const usersSnapshot = await db.collection("users")
        .where("expoPushToken", "!=", null)
        .get();

    const tokens = [];
    usersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.expoPushToken) {
            tokens.push(data.expoPushToken);
        }
    });

    return tokens;
}

/**
 * Trigger: When a new notification document is created in Firestore.
 * If scheduledAt is not set or is in the past, sends immediately.
 * Otherwise, marks as 'scheduled' for the cron job to pick up.
 */
exports.sendNotification = onDocumentCreated(
    { document: "notifications/{notificationId}", region: "us-central1" },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const data = snapshot.data();
        const notificationRef = snapshot.ref;
        const { title, body, scheduledAt } = data;

        if (!title || !body) {
            console.log("Notification missing title or body, skipping.");
            await notificationRef.update({ status: "error", error: "Missing title or body" });
            return;
        }

        // Check if this is a scheduled notification
        if (scheduledAt) {
            const scheduledTime = scheduledAt.toDate ? scheduledAt.toDate() : new Date(scheduledAt);
            const now = new Date();

            if (scheduledTime > now) {
                // Future notification — mark as scheduled, cron will handle it
                console.log(`Notification scheduled for ${scheduledTime.toISOString()}`);
                await notificationRef.update({ status: "scheduled" });
                return;
            }
        }

        // Send immediately
        try {
            const tokens = await getAllPushTokens();
            const result = await sendExpoPush(tokens, title, body, { notificationId: event.params.notificationId });

            await notificationRef.update({
                status: "sent",
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                recipientCount: result.sent,
                errors: result.errors.length > 0 ? result.errors : null,
            });

            console.log(`Notification sent to ${result.sent} devices.`);
        } catch (error) {
            console.error("Error sending notification:", error);
            await notificationRef.update({
                status: "error",
                error: error.message,
            });
        }
    }
);

/**
 * Cron job: Runs every minute to check for scheduled notifications
 * whose scheduledAt has passed, and sends them.
 */
exports.processScheduledNotifications = onSchedule(
    { schedule: "every 1 minutes", region: "us-central1" },
    async () => {
        const now = new Date();

        const scheduledSnapshot = await db.collection("notifications")
            .where("status", "==", "scheduled")
            .where("scheduledAt", "<=", now)
            .get();

        if (scheduledSnapshot.empty) {
            return;
        }

        console.log(`Processing ${scheduledSnapshot.size} scheduled notification(s).`);
        const tokens = await getAllPushTokens();

        for (const doc of scheduledSnapshot.docs) {
            const data = doc.data();

            try {
                const result = await sendExpoPush(tokens, data.title, data.body, { notificationId: doc.id });

                await doc.ref.update({
                    status: "sent",
                    sentAt: admin.firestore.FieldValue.serverTimestamp(),
                    recipientCount: result.sent,
                    errors: result.errors.length > 0 ? result.errors : null,
                });

                console.log(`Scheduled notification ${doc.id} sent to ${result.sent} devices.`);
            } catch (error) {
                console.error(`Error sending scheduled notification ${doc.id}:`, error);
                await doc.ref.update({
                    status: "error",
                    error: error.message,
                });
            }
        }
    }
);

/**
 * Parses uploaded PDFs to extract context for ChatGPT.
 * Triggered when a new file is uploaded to the "compliance_docs" or "assistant_docs" folder in Firebase Storage.
 */
exports.processInternalDocument = onObjectFinalized({ region: "us-central1" }, async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;

    // Only process files in expected folders and pdfs
    const isCompliance = filePath.startsWith('compliance_docs/');
    const isAssistant = filePath.startsWith('assistant_docs/');

    if ((!isCompliance && !isAssistant) || !filePath.endsWith('.pdf')) {
        return;
    }

    console.log(`Processing new PDF: ${filePath}`);

    try {
        const bucket = admin.storage().bucket(fileBucket);
        const file = bucket.file(filePath);

        // Download the file into memory
        const [buffer] = await file.download();

        // Parse PDF text
        const parseFn = typeof pdfParse === 'function' ? pdfParse : pdfParse.default;
        const data = await parseFn(buffer);
        const text = data.text;

        if (isCompliance) {
            // Save extracted text to Firestore for quick context retrieval during exam generation
            await db.collection('compliance_content').doc('material_interno').set({
                text: text,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                sourceFile: filePath
            });
        } else if (isAssistant) {
            // Save extracted text to Assistant configs
            await db.collection('ai_assistant_config').doc('main_config').set({
                knowledgeBaseText: text,
                knowledgeBaseFile: filePath,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }

        console.log(`Successfully extracted ${text.length} characters from ${filePath}.`);
    } catch (error) {
        console.error("Error processing PDF:", error);
    }
});

/**
 * HTTPS Callable: Generates a 20-question certification test based on SUSEP rules
 * and optionally Internal Material.
 */
exports.generateCertificationTest = onCall({ region: "us-central1", timeoutSeconds: 300 }, async (request) => {
    try {
        const { isTrainingMode, internalMaterialPercentage = 0, certificationId } = request.data || {};
        const uid = request.auth?.uid;

        if (!uid) {
            throw new HttpsError("unauthenticated", "User must be authenticated to generate a test.");
        }

        // Fetch required context from Firestore
        let certificationRules = {};
        if (certificationId) {
            const certDoc = await db.collection("certifications").doc(certificationId).get();
            certificationRules = certDoc.exists ? certDoc.data() : {};
        } else {
            const susepDoc = await db.collection("compliance_content").doc("susep_rules").get();
            certificationRules = susepDoc.exists ? susepDoc.data() : {};
        }

        const internalDoc = await db.collection("compliance_content").doc("material_interno").get();
        const internalMaterial = internalDoc.exists ? internalDoc.data().text : "";

        // Build prompt context
        let contextText = `O que PODE falar/fazer: ${certificationRules.canSay || ''}\n`;
        contextText += `O que NÃO PODE falar/fazer: ${certificationRules.cannotSay || ''}\n`;
        if (certificationRules.mutualism) contextText += `Como explicar o Mutualismo: ${certificationRules.mutualism}\n`;
        if (certificationRules.promises) contextText += `Como evitar promessa indevida: ${certificationRules.promises}\n`;
        if (certificationRules.guidelines) contextText += `Orientações Extras (Prompt Base): ${certificationRules.guidelines}\n`;

        let promptInternalInstruction = "";
        if (internalMaterial && internalMaterialPercentage > 0) {
            contextText += `\n--- MATERIAL INTERNO (Políticas Internas / Treinamento Comercial) ---\n${internalMaterial}\n-----------------------------------\n`;
            promptInternalInstruction = `Certifique-se de que aproximadamente ${internalMaterialPercentage}% das questões sejam baseadas exclusivamente no MATERIAL INTERNO, e o restante nas regras fornecidas.`;
        }

        const questionCount = certificationRules.questionCount || 20;

        const prompt = `
            Você é um especialista e criador de treinamentos corporativos para capacitação profissional.
            
            Com base no conteúdo de contexto abaixo, crie uma prova com exatamente ${questionCount} questões de múltipla escolha. 
            Cada questão deve ter opções de "A" até "E" (5 opções), sendo APENAS UMA a correta.
            ${promptInternalInstruction}

            CONTEXTO DE ESTUDO:
            ${contextText}

            INSTRUÇÕES DE FORMATAÇÃO (CRÍTICO): 
            Responda EXCLUSIVAMENTE com um JSON válido seguindo a estrutura exata abaixo, sem markdown, sem crases, sem texto adicional. Apenas o JSON puro:
            {
                "questions": [
                    {
                        "id": "q1",
                        "text": "Texto da pergunta aqui",
                        "options": [
                            { "id": "A", "text": "Texto da opção A" },
                            { "id": "B", "text": "Texto da opção B" },
                            { "id": "C", "text": "Texto da opção C" },
                            { "id": "D", "text": "Texto da opção D" },
                            { "id": "E", "text": "Texto da opção E" }
                        ],
                        "correctOptionId": "C"
                    }
                ]
            }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // GPT-4o-mini to balance speed, cost, and json output
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.7,
        });

        const jsonResult = JSON.parse(response.choices[0].message.content);

        // Log the test attempt to Firestore to track open/closed attempts
        const attemptRef = db.collection('certification_attempts').doc();
        await attemptRef.set({
            userId: uid,
            isTrainingMode: !!isTrainingMode,
            certificationId: certificationId || 'susep',
            status: "in_progress",
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
            internalMaterialPercentage,
            score: null,
            totalQuestions: questionCount
        });

        return {
            attemptId: attemptRef.id,
            questions: jsonResult.questions
        };

    } catch (error) {
        console.error("Error generating test:", error);
        throw new HttpsError("internal", "Failed to generate test. " + error.message);
    }
});

/**
 * HTTPS Callable: Requests feedback from OpenAI when a user gets a question wrong in Training Mode.
 */
exports.getTrainingFeedback = onCall({ region: "us-central1" }, async (request) => {
    try {
        const { questionText, selectedOptionText, correctOptionText, certificationId } = request.data || {};
        const uid = request.auth?.uid;

        if (!uid) {
            throw new HttpsError("unauthenticated", "User must be authenticated.");
        }

        // Fetch context to make feedback accurate
        let certificationRules = {};
        if (certificationId) {
            const certDoc = await db.collection("certifications").doc(certificationId).get();
            certificationRules = certDoc.exists ? certDoc.data() : {};
        } else {
            const susepDoc = await db.collection("compliance_content").doc("susep_rules").get();
            certificationRules = susepDoc.exists ? susepDoc.data() : {};
        }

        let contextText = `O que PODE falar: ${certificationRules.canSay || ''}\n`;
        contextText += `O que NÃO PODE falar: ${certificationRules.cannotSay || ''}\n`;
        if (certificationRules.guidelines) contextText += `Orientações Extras: ${certificationRules.guidelines}\n`;

        const prompt = `
            Você é um tutor de capacitação profissional.
            O aluno respondeu a seguinte questão e ERROU.
            
            Questão: "${questionText}"
            Opção que o aluno escolheu (Errada): "${selectedOptionText}"
            Opção correta: "${correctOptionText}"
            
            Com base no contexto de regras da nossa empresa:
            ${contextText}

            INSTRUÇÃO:
            Escreva um parágrafo conciso, claro e encorajador explicando POR QUE a resposta do aluno está errada e por que a resposta correta é a adequada, referenciando as regras ou o conceito envolvido. Não repita a pergunta.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });

        return { feedback: response.choices[0].message.content.trim() };

    } catch (error) {
        console.error("Error generating feedback:", error);
        throw new HttpsError("internal", "Failed to generate feedback.");
    }
});

/**
 * HTTPS Callable: Asks the AI Consultant Assistant a question based on Admin configurations.
 * Maintains conversation history if the client passes 'messages' array instead of a single string.
 */
exports.askAssistant = onCall({ region: "us-central1", timeoutSeconds: 300 }, async (request) => {
    try {
        const { message, history = [], imageBase64 } = request.data || {};
        const uid = request.auth?.uid;

        if (!uid) {
            throw new HttpsError("unauthenticated", "User must be authenticated to chat with the assistant.");
        }

        if (!message) {
            throw new HttpsError("invalid-argument", "Message cannot be empty.");
        }

        // Fetch Assistant configurations
        const configDoc = await db.collection("ai_assistant_config").doc("main_config").get();
        const config = configDoc.exists ? configDoc.data() : {};

        const persona = config.persona || "Você é um assistente de IA prestativo e especializado em proteção veicular.";
        const orientations = config.orientations || "Seja educado, persuasivo e ajude o consultor com contra-argumentações de forma ética.";
        const assistantId = config.openAiAssistantId;

        // Note: For now, we are using chat.completions to avoid the complexity of managing Threads 
        // per user on the DB, but if an assistantId is strictly required later we can implement it.
        // We will pass the persona and context as a SYSTEM message, followed by the user's history.

        // Format the system prompt including the knowledge base
        let knowledgeBaseSection = "";
        if (config.knowledgeBaseText) {
            // Limit knowledge base text just in case it's huge, to prevent token exhaust (e.g 10k tokens ~30k chars)
            const slicedKb = config.knowledgeBaseText.substring(0, 30000);
            knowledgeBaseSection = `\n\nBASE DE CONHECIMENTO TÉCNICO E CONTRATUAL (PDF ANEXO):\n${slicedKb}\nUse estritamente este material de base para dar respostas sobre produtos e regras.`;
        }

        const systemContent = `
            ${persona}

            ORIENTAÇÕES EXTRAS E REGRAS:
            ${orientations}
            ${knowledgeBaseSection}
        `.trim();

        // Construct user content (can be string or array if image is present)
        let userContent = message;
        if (imageBase64) {
            userContent = [
                { type: "text", text: message || "Analise a imagem a seguir:" },
                {
                    type: "image_url",
                    image_url: {
                        url: `data:image/jpeg;base64,${imageBase64}`
                    }
                }
            ];
        }

        // Format history for OpenAI
        const messages = [
            { role: "system", content: systemContent },
            ...history,
            { role: "user", content: userContent }
        ];

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            temperature: 0.7,
        });

        const reply = response.choices[0].message.content.trim();

        // Optional: Save interaction to Firestore for analytics
        await db.collection("ai_assistant_logs").add({
            userId: uid,
            message: message,
            reply: reply,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return { reply };

    } catch (error) {
        console.error("Error asking assistant:", error);
        throw new HttpsError("internal", "Failed to communicate with the Assistant. " + error.message);
    }
});

/**
 * HTTPS Callable: Creates a GCS resumable upload session URI for direct browser upload.
 * Uses OAuth token (no signing permission needed). Bypasses Firebase SDK HTTP/2 bug.
 */
exports.getSignedUploadUrl = onCall({ region: "us-central1" }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Authentication required.");

    const { filePath, contentType } = request.data || {};
    if (!filePath || !contentType) throw new HttpsError("invalid-argument", "filePath and contentType are required.");

    if (!filePath.startsWith("course_videos/")) {
        throw new HttpsError("permission-denied", "Upload path not allowed.");
    }

    try {
        const bucket = admin.storage().bucket();
        const file = bucket.file(filePath);

        const [uploadUrl] = await file.createResumableUpload({
            metadata: { contentType },
            origin: "https://prot-veicul-base.web.app",
        });

        return { uploadUrl };
    } catch (err) {
        console.error("getSignedUploadUrl error:", err);
        throw new HttpsError("internal", err.message);
    }
});

/**
 * HTTPS Callable: After XHR upload via signed URL, sets download token and returns the Firebase download URL.
 */
exports.finalizeVideoUpload = onCall({ region: "us-central1" }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Authentication required.");

    const { filePath } = request.data || {};
    if (!filePath) throw new HttpsError("invalid-argument", "filePath is required.");

    if (!filePath.startsWith("course_videos/")) {
        throw new HttpsError("permission-denied", "Path not allowed.");
    }

    const token = require("crypto").randomUUID();
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);

    // Set download token + CDN cache headers
    await file.setMetadata({
        contentType: (await file.getMetadata())[0].contentType || "video/mp4",
        cacheControl: "public, max-age=31536000",
        metadata: { firebaseStorageDownloadTokens: token },
    });

    const bucketName = bucket.name;
    const encodedPath = encodeURIComponent(filePath);
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;

    return { downloadUrl };
});
