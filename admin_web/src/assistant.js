import { db, storage } from './firebase.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Define the worker script path locally via Vite url import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export function initAssistant() {
    console.log("Initializing Assistant AI Panel...");

    const form = document.getElementById('assistantConfigForm');
    const nameInput = document.getElementById('ai-ast-name');
    const personaInput = document.getElementById('ai-ast-persona');
    const orientationsInput = document.getElementById('ai-ast-orientations');
    const filesContainer = document.getElementById('ai-ast-files-container');
    const btnAddAiAstFile = document.getElementById('btnAddAiAstFile');
    const fileStatus = document.getElementById('ai-ast-file-status');
    const currentFilesList = document.getElementById('ai-ast-current-files-list');
    const btnSave = document.getElementById('saveAssistantConfigBtn');

    if (!form) return;

    // Load existing config
    async function loadConfig() {
        try {
            const docRef = doc(db, 'ai_assistant_config', 'main_config');
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                const data = snap.data();
                nameInput.value = data.name || '';
                personaInput.value = data.persona || '';
                orientationsInput.value = data.orientations || '';
                if (data.fileNames && Array.isArray(data.fileNames)) {
                    currentFilesList.innerHTML = "<strong>Arquivos Registrados:</strong><br>" + data.fileNames.join('<br>');
                } else if (data.fileName) {
                    currentFilesList.innerHTML = `<strong>Arquivo Registrado:</strong><br>${data.fileName}`;
                }
            }
        } catch (error) {
            console.error("Error loading Assistant config:", error);
            alert("Erro ao carregar configurações do assistente.");
        }
    }

    // Handle Add More Files Button
    if (btnAddAiAstFile) {
        btnAddAiAstFile.addEventListener('click', () => {
            const row = document.createElement('div');
            row.className = 'ai-ast-file-row';
            row.style = 'display:flex; gap:8px; align-items:center; margin-top:8px;';
            row.innerHTML = `
                <input type="file" class="ai-ast-file" accept=".pdf,.txt,.docx" style="flex:1;">
                <button type="button" class="btn-secondary remove-file-btn" style="padding:4px 8px;">X</button>
            `;
            row.querySelector('.remove-file-btn').addEventListener('click', () => {
                row.remove();
            });
            filesContainer.appendChild(row);
        });
    }

    // Handle Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            btnSave.textContent = "Processando Arquivos e Salvando...";
            btnSave.disabled = true;
            fileStatus.textContent = "Lendo arquivos locais...";
            fileStatus.style.color = 'var(--primary)';

            const fileInputs = document.querySelectorAll('.ai-ast-file');
            let fullCombinedText = "";
            let uploadedFileNames = [];
            let uploadedFileUrls = [];

            let hasNewFiles = false;

            for (const input of fileInputs) {
                if (input.files && input.files.length > 0) {
                    hasNewFiles = true;
                    const file = input.files[0];
                    // Read file
                    fileStatus.textContent = `Extraindo texto: ${file.name}...`;
                    const arrayBuffer = await file.arrayBuffer();

                    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
                        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        let pdfText = "";
                        for (let i = 1; i <= pdfDoc.numPages; i++) {
                            const page = await pdfDoc.getPage(i);
                            const textContent = await page.getTextContent();
                            pdfText += textContent.items.map(item => item.str).join(' ') + "\n";
                        }
                        fullCombinedText += `\n--- Documento: ${file.name} ---\n` + pdfText;
                    } else {
                        // For generic txt handling
                        const textDecoder = new TextDecoder('utf-8');
                        const text = textDecoder.decode(arrayBuffer);
                        fullCombinedText += `\n--- Documento: ${file.name} ---\n` + text;
                    }

                    // Upload file
                    fileStatus.textContent = `Vínculando ${file.name} à nuvem...`;
                    const storageRef = ref(storage, `assistant_docs/${Date.now()}_${file.name}`);
                    const snapshot = await uploadBytes(storageRef, file);
                    const downloadUrl = await getDownloadURL(snapshot.ref);

                    uploadedFileNames.push(file.name);
                    uploadedFileUrls.push(downloadUrl);
                }
            }

            const configData = {
                name: nameInput.value.trim(),
                persona: personaInput.value.trim(),
                orientations: orientationsInput.value.trim(),
                updatedAt: serverTimestamp()
            };

            if (hasNewFiles) {
                if (fullCombinedText.trim().length === 0) {
                    throw new Error("Os arquivos fornecidos estão vazios ou não puderam ser lidos.");
                }
                configData.knowledgeBaseText = fullCombinedText;
                configData.fileNames = uploadedFileNames;
                configData.fileUrls = uploadedFileUrls;

                // Clear legacy single file references
                configData.fileName = null;
                configData.fileUrl = null;
            }

            fileStatus.textContent = "Salvando Banco de Dados...";
            const docRef = doc(db, 'ai_assistant_config', 'main_config');
            await setDoc(docRef, configData, { merge: true });

            fileStatus.textContent = "Concluído com sucesso!";
            fileStatus.style.color = '#10b981'; // green
            alert("Configurações do Assistente salvas com sucesso!");

            // Render new files on UI
            if (hasNewFiles) {
                currentFilesList.innerHTML = "<strong>Arquivos Registrados:</strong><br>" + uploadedFileNames.join('<br>');

                // Reset file inputs UI down to 1 empty input
                filesContainer.innerHTML = `
                  <div class="ai-ast-file-row" style="display:flex; gap:8px; align-items:center;">
                    <input type="file" class="ai-ast-file" accept=".pdf,.txt,.docx" style="flex:1;">
                    <button type="button" class="btn-secondary remove-file-btn" style="padding:4px 8px; display:none;">X</button>
                  </div>
                `;
            }

        } catch (error) {
            console.error("Error saving Assistant config:", error);
            fileStatus.textContent = `Erro: ${error.message}`;
            fileStatus.style.color = '#ef4444'; // red
            alert("Erro ao salvar. Verifique o console.");
        } finally {
            btnSave.textContent = "💾 Salvar Configurações Globais da IA";
            btnSave.disabled = false;
        }
    });

    // Initialize
    loadConfig();
}
