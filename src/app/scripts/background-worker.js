import "dotenv/config";
import cron from "node-cron";
import { google } from "googleapis";

// Re-using project logic
import { processEmailAttachments } from "../lib/processor.js";
import { connectToDatabase, User, AppState, EmailLog } from "../lib/db.mjs";

let isWorkerRunning = false;

async function getGmailClient(accessToken) {
    const auth = new google.auth.OAuth2(
        process.env.AUTH_GOOGLE_ID,
        process.env.AUTH_GOOGLE_SECRET
    );
    auth.setCredentials({ access_token: accessToken });
    return google.gmail({ version: 'v1', auth });
}

async function refreshUserToken(email, refreshToken) {
    console.log(`[Worker] Refreshing token for ${email}...`);
    try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            method: "POST",
            body: new URLSearchParams({
                client_id: process.env.AUTH_GOOGLE_ID,
                client_secret: process.env.AUTH_GOOGLE_SECRET,
                grant_type: "refresh_token",
                refresh_token: refreshToken,
            }),
        });

        const data = await response.json();
        if (!response.ok) throw data;

        const newExpires = Date.now() + data.expires_in * 1000;
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || refreshToken,
            accessTokenExpires: newExpires
        };
    } catch (error) {
        console.error(`[Worker] Failed to refresh token for ${email}:`, error);
        return null;
    }
}

async function checkEmailsForUser(email, userData) {
    let { accessToken, refreshToken, accessTokenExpires } = userData;

    // Check if refresh is needed
    if (Date.now() > accessTokenExpires - 300000) { // Refresh 5 mins before expiry
        const refreshed = await refreshUserToken(email, refreshToken);
        if (refreshed) {
            accessToken = refreshed.accessToken;
            refreshToken = refreshed.refreshToken;
            accessTokenExpires = refreshed.accessTokenExpires;

            // Save back to DB
            await User.findOneAndUpdate(
                { email },
                { accessToken, refreshToken, accessTokenExpires, lastSeen: new Date() }
            );
        } else {
            console.error(`[Worker] Skipping ${email} due to refresh failure.`);
            return;
        }
    }

    try {
        const gmail = await getGmailClient(accessToken);

        // Load global state for processed IDs and activation time
        let stateDoc = await AppState.findOne({ key: 'processed_ids' });
        let processedIds = stateDoc ? stateDoc.value : [];

        let timeDoc = await AppState.findOne({ key: 'activation_time' });
        if (!timeDoc) {
            // Set activation time to current if not set
            const now = Date.now();
            timeDoc = await AppState.findOneAndUpdate(
                { key: 'activation_time' },
                { value: now },
                { upsert: true, new: true }
            );
            console.log(`[Worker] Initialized activation_time to ${new Date(now).toISOString()}`);
        }
        const activationTime = timeDoc.value;

        const res = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 15,
            q: 'in:inbox'
        });

        const messages = res.data.messages || [];
        let newProcessed = false;

        for (const msg of messages) {
            if (!processedIds.includes(msg.id)) {
                // Double check against EmailLog to prevent duplicates if someone deleted AppState
                const existingLog = await EmailLog.findOne({ messageId: msg.id });
                if (existingLog && ['analyzing', 'processed', 'replied', 'received'].includes(existingLog.status)) {
                    console.log(`[Worker] Skipping email already being handled or finished: ${msg.id} (Status: ${existingLog.status})`);
                    processedIds.push(msg.id);
                    newProcessed = true;
                    continue;
                }

                const fullMsgRes = await gmail.users.messages.get({ userId: 'me', id: msg.id });
                const fullMsg = fullMsgRes.data;
                const internalDate = parseInt(fullMsg.internalDate);

                if (internalDate < activationTime) {
                    // console.log(`[Worker] Skipping old email: ${msg.id} (Received: ${new Date(internalDate).toISOString()})`);
                    processedIds.push(msg.id); // Mark as processed so we don't fetch it again
                    newProcessed = true;

                    // Update DB immediately for old emails too
                    await AppState.findOneAndUpdate(
                        { key: 'processed_ids' },
                        { $addToSet: { value: msg.id } },
                        { upsert: true }
                    );
                    continue;
                }

                console.log(`[Worker] New email for ${email}: ${msg.id}`);

                // Mark as processing in processedIds to prevent other loops if they happen to start
                processedIds.push(msg.id);
                await AppState.findOneAndUpdate(
                    { key: 'processed_ids' },
                    { $addToSet: { value: msg.id } },
                    { upsert: true }
                );

                try {
                    await processEmailAttachments(accessToken, fullMsg);
                    newProcessed = true;
                } catch (procErr) {
                    console.error(`[Worker] Failed to process ${msg.id}:`, procErr.message);
                    // Optionally remove from processedIds if we want to retry, but usually we don't want to loop forever
                }
            }
        }

        if (newProcessed) {
            // Keep state manageable
            stateDoc = await AppState.findOne({ key: 'processed_ids' });
            let currentIds = stateDoc ? stateDoc.value : [];
            if (currentIds.length > 1000) {
                currentIds = currentIds.slice(-1000);
                await AppState.findOneAndUpdate(
                    { key: 'processed_ids' },
                    { value: currentIds },
                    { upsert: true }
                );
            }
        }

    } catch (error) {
        console.error(`[Worker] Error for ${email}:`, error.message);
    }
}

async function runWorker() {
    if (isWorkerRunning) {
        console.log("[Worker] A cycle is already running. Skipping this one.");
        return;
    }
    isWorkerRunning = true;
    console.log(`[Worker] Started cycle at ${new Date().toISOString()}`);
    try {
        await connectToDatabase();
        const users = await User.find({});

        if (users.length === 0) {
            console.log("[Worker] No users in database. Waiting for log-ins...");
            isWorkerRunning = false;
            return;
        }

        for (const user of users) {
            console.log(`[Worker] Checking ${user.email}...`);
            await checkEmailsForUser(user.email, user);
        }
    } catch (err) {
        console.error("[Worker] Global Error:", err);
    } finally {
        isWorkerRunning = false;
        console.log(`[Worker] Finished cycle at ${new Date().toISOString()}`);
    }
}

// Run every minute
cron.schedule("* * * * *", () => {
    runWorker().catch(console.error);
});

// Run once on start
runWorker().catch(console.error);
console.log("Worker initialized. Using MongoDB. Polling every minute.");

