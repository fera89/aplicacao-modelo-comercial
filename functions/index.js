const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.firestore();

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
