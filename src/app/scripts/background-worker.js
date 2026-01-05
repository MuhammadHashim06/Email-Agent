import "dotenv/config";
import cron from "node-cron";
import { google } from "googleapis";

// Re-using project logic
import { processEmailAttachments } from "../lib/processor.js";
import { connectToDatabase, User, AppState, EmailLog, Notification } from "../lib/db.mjs";

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
async function checkIfEmailExists(messageId) {
    try {
        const existingEmail = await EmailLog.findOne({ messageId });
        return existingEmail;
    } catch (error) {
        console.error(`[Worker] Error checking email ${messageId}:`, error);
        return null;
    }
}
async function addNewEmailToLog(messageId, threadId) {
    try {
        const claim = await EmailLog.findOneAndUpdate(
            { messageId },
            {
                $setOnInsert: {
                    status: 'received', // Mark as received initially
                    subject: '(Claiming...)',
                    emailType: 'incoming',
                    threadId
                }
            },
            { upsert: true, new: true, rawResult: true } // Ensure it is inserted if not existing
        );

        if (claim.lastErrorObject?.updatedExisting) {
            console.log(`[Worker] Email already processed or claimed, skipping: ${messageId}`);
            return false; // Email was already processed, don't continue
        } else {
            console.log(`[Worker] New email added to log: ${messageId}`);
            return true; // New email was added successfully
        }
    } catch (err) {
        console.error(`[Worker] Error adding email ${messageId} to log:`, err);
        return false;
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

        // Load the last checkpoint time
        let checkpointDoc = await AppState.findOne({ key: 'last_fetch_checkpoint' });
        if (!checkpointDoc) {
            // First run, initialize to now (or activation time if exists)
            const now = Date.now();
            let checkpointDoc = await AppState.findOneAndUpdate(
                { key: 'last_fetch_checkpoint' },
                { value: now },
                { upsert: true, new: true }
            );
            console.log(`[Worker] Initialized last_fetch_checkpoint to ${new Date(now).toISOString()}`);
        }
        const lastCheckpoint = checkpointDoc.value;
        // const lastCheckpoint = Date.now();
        const now = Date.now();
        // Dynamic Catch-Up: Process from last checkpoint up to NOW.
        // This handles any job duration (e.g. if job takes 7 mins, next run covers the 7 min gap)
        let chunkEnd = now;

        // Safety: If we are WAY behind (> 24 hours), limit the chunk to 1 hour to avoid API timeouts
        if (chunkEnd - lastCheckpoint > 24 * 60 * 60 * 1000) {
            console.log("[Worker] Very far behind (>24h). Limiting batch to 1 hour.");
            chunkEnd = lastCheckpoint + (60 * 60 * 1000);
        }

        // If the window is too small (e.g. < 2 seconds), just wait for next cycle
        if (chunkEnd - lastCheckpoint < 2000) {
            console.log("[Worker] caught up. Waiting for more time to pass.");
            return;
        }

        console.log(`[Worker] Processing window: ${new Date(lastCheckpoint).toISOString()} -> ${new Date(chunkEnd).toISOString()}`);

        const afterSeconds = Math.floor(lastCheckpoint / 1000);
        const beforeSeconds = Math.ceil(chunkEnd / 1000);

        // const res = await gmail.users.messages.list({
        //     userId: 'me',
        //     q: `in:inbox after:${afterSeconds} before:${beforeSeconds}`
        // });
        // const afterSeconds = Math.floor(lastCheckpoint / 1000);
        // const beforeSeconds = Math.ceil(chunkEnd / 1000);
        // Local Time: Jan 5, 01:30 AM - 01:40 AM
        // UTC Time:   Jan 4, 08:30 PM - 08:40 PM

        // const afterSeconds = 1767558600;  // Matches 1:30 AM your time
        // const beforeSeconds = 1767559200; // Matches 1:40 AM your time

        console.log("Searching Local Time: 01:30 AM - 01:40 AM");
        console.log("afterSeconds (UTC):", afterSeconds);
        console.log("beforeSeconds (UTC):", beforeSeconds);
        // Ensure the query is tight
        const res = await gmail.users.messages.list({
            userId: 'me',
            q: `in:inbox after:${afterSeconds} before:${beforeSeconds}`
        });
        console.log("res.data", res.data);
        const messages = res.data.messages || [];

        for (const msg of messages) {
            console.log("msg id", msg.id);
            // 1. Initial self check
            const fullMsgRes = await gmail.users.messages.get({ userId: 'me', id: msg.id });
            const fullMsg = fullMsgRes.data;

            const fromHeader = fullMsg.payload.headers.find(h => h.name.toLowerCase() === 'from')?.value || "";
            const isSelf = fromHeader.toLowerCase().includes(email.toLowerCase());
            const isOurReply = fullMsg.snippet.includes("Sehr geehrte Damen und Herren, anbei finden Sie Ihre Stellungnahme");
            console.log("isSelf", isSelf);
            // console.log("isOurReply", isOurReply);

            // if (isSelf || isOurReply) {
            //     console.log("isSelf or isOurReply", isSelf || isOurReply);
            //     continue;
            // }

            // 2. Atomic claim via EmailLog
            try {
                const duplicate = await EmailLog.findOne({ messageId: msg.id });
                if (duplicate) {
                    if (duplicate.status === 'received') {
                        console.log(`[Worker] Duplicate message ${msg.id} found. Skipping.`);
                        continue;
                    }
                }
                const claim = await EmailLog.findOneAndUpdate(
                    { messageId: msg.id },
                    {
                        $setOnInsert: {
                            status: 'received',
                            subject: '(Claiming...)',
                            emailType: 'incoming',
                            threadId: msg.threadId
                        }
                    },
                    { upsert: true, new: false, rawResult: true }
                );

                // Determine if the document already existed.
                // If claim is null, it means a new document was inserted (because new: false returns original, which was null).
                // If claim has lastErrorObject, use updatedExisting (support for rawResult).
                // If claim is a document (no lastErrorObject), it means it existed.
                const isExisting = claim
                    ? (claim.lastErrorObject ? claim.lastErrorObject.updatedExisting : true)
                    : false;

                if (isExisting) {
                    // console.log("claim", claim);
                    continue; // Already claimed or processed by another run
                }
                console.log(`[Worker] Atomic lock acquired for ${msg.id}`);
            } catch (err) {
                console.error(`[Worker] Failed to claim message ${msg.id}:`, err);
                continue;
            }

            // 3. Thread Guard
            const existingThreadLog = await EmailLog.findOne({
                threadId: msg.threadId,
                status: 'replied',
                messageId: { $ne: msg.id },
                updatedAt: { $gt: new Date(Date.now() - 300000) } // 5 minutes
            });

            if (existingThreadLog) {
                console.log(`[Worker] Thread Guard: Already replied to thread ${msg.threadId} recently. Skipping.`);
                await EmailLog.findOneAndUpdate({ messageId: msg.id }, { status: 'skipped', reason: 'Thread debounce (5m)' });
                continue;
            }

            console.log(`[Worker] Processing new email: ${msg.id}`);

            // Create Notification
            try {
                // Extract clean sender name
                let senderName = fromHeader;
                if (senderName.includes('<')) {
                    senderName = senderName.split('<')[0].trim().replace(/"/g, '');
                }

                const subject = fullMsg.payload.headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';

                await Notification.create({
                    userEmail: email,
                    message: `New Email from ${senderName}: ${subject}`,
                    type: 'info',
                    relatedId: msg.id,
                    isRead: false
                });
            } catch (notifError) {
                console.error(`[Worker] Failed to create notification for ${msg.id}:`, notifError);
            }

            try {
                await processEmailAttachments(accessToken, fullMsg);
            } catch (procErr) {
                console.error(`[Worker] Failed to process ${msg.id}:`, procErr.message);
                await EmailLog.findOneAndUpdate({ messageId: msg.id }, { status: 'error', reason: procErr.message });
            }
        }

        // Successfully processed this window, update checkpoint
        await AppState.findOneAndUpdate(
            { key: 'last_fetch_checkpoint' },
            { value: chunkEnd },
            { upsert: true }
        );
        console.log(`[Worker] Window complete. Updated checkpoint to ${new Date(chunkEnd).toISOString()}`);

    } catch (error) {
        console.error(`[Worker] Error for ${email}:`, error.message);
    }
}

async function runWorker() {
    if (isWorkerRunning) {
        console.log("[Worker] Previous cycle still running. Queuing...");
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

// Run every minute to check if worker is free and there is work to do
cron.schedule("* * * * *", () => {
    runWorker().catch(console.error);
});

// cron.schedule("0 12 * * *", () => {
//     runWorker().catch(console.error);
// });

// Run once on start
runWorker().catch(console.error);

