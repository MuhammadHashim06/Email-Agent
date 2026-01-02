import "dotenv/config";
import cron from "node-cron";
import { google } from "googleapis";

// Re-using project logic
import { processEmailAttachments } from "../lib/processor.js";
import { connectToDatabase, User, AppState } from "../lib/db.mjs";

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
                const fullMsgRes = await gmail.users.messages.get({ userId: 'me', id: msg.id });
                const fullMsg = fullMsgRes.data;
                const internalDate = parseInt(fullMsg.internalDate);

                if (internalDate < activationTime) {
                    // console.log(`[Worker] Skipping old email: ${msg.id} (Received: ${new Date(internalDate).toISOString()})`);
                    processedIds.push(msg.id); // Mark as processed so we don't fetch it again
                    newProcessed = true;
                    continue;
                }

                console.log(`[Worker] New email for ${email}: ${msg.id}`);
                await processEmailAttachments(accessToken, fullMsg);

                processedIds.push(msg.id);
                newProcessed = true;
            }
        }

        if (newProcessed) {
            // Keep state manageable
            if (processedIds.length > 1000) processedIds = processedIds.slice(-1000);
            await AppState.findOneAndUpdate(
                { key: 'processed_ids' },
                { value: processedIds },
                { upsert: true }
            );
        }

    } catch (error) {
        console.error(`[Worker] Error for ${email}:`, error.message);
    }
}

async function runWorker() {
    console.log(`[Worker] Started cycle at ${new Date().toISOString()}`);
    try {
        await connectToDatabase();
        const users = await User.find({});

        if (users.length === 0) {
            console.log("[Worker] No users in database. Waiting for log-ins...");
            return;
        }

        for (const user of users) {
            console.log(`[Worker] Checking ${user.email}...`);
            await checkEmailsForUser(user.email, user);
        }
    } catch (err) {
        console.error("[Worker] Global Error:", err);
    }
}

// Run every minute
cron.schedule("* * * * *", () => {
    runWorker().catch(console.error);
});

// Run once on start
runWorker().catch(console.error);
console.log("Worker initialized. Using MongoDB. Polling every minute.");

