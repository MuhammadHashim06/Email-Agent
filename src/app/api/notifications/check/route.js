import { auth } from "../../../auth";
import { listMessages, getGmailClient } from "../../../lib/gmail";
import { processEmailAttachments } from "../../../lib/processor";
import { NextResponse } from "next/server";
import { connectToDatabase, AppState } from "../../../lib/db.mjs";

export async function GET(req) {
    const session = await auth();
    if (!session || !session.accessToken) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        await connectToDatabase();

        // Load state from DB
        const stateDoc = await AppState.findOne({ key: 'processed_ids' });
        let processedIds = stateDoc ? stateDoc.value : [];

        let timeDoc = await AppState.findOne({ key: 'activation_time' });
        if (!timeDoc) {
            const now = Date.now();
            timeDoc = await AppState.findOneAndUpdate(
                { key: 'activation_time' },
                { value: now },
                { upsert: true, new: true }
            );
        }
        const activationTime = timeDoc.value;

        const gmail = await getGmailClient(session.accessToken);
        const res = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 5, // Just check the latest 5
            q: 'in:inbox'
        });

        const messages = res.data.messages || [];
        const newMessages = [];
        let stateChanged = false;

        for (const msg of messages) {
            if (!processedIds.includes(msg.id)) {
                // Fetch full message content for processing
                const fullMsgRes = await gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id
                });
                const fullMsg = fullMsgRes.data;
                const internalDate = parseInt(fullMsg.internalDate);

                if (internalDate < activationTime) {
                    processedIds.push(msg.id);
                    stateChanged = true;
                    continue;
                }

                // Trigger background processing
                console.log(`New email detected: ${msg.id}. Processing...`);
                await processEmailAttachments(session.accessToken, fullMsg);

                newMessages.push({
                    id: msg.id,
                    subject: fullMsg.payload.headers.find(h => h.name === 'Subject')?.value || 'No Subject',
                    from: fullMsg.payload.headers.find(h => h.name === 'From')?.value || 'Unknown',
                    snippet: fullMsg.snippet
                });

                processedIds.push(msg.id);
                stateChanged = true;
            }
        }

        if (stateChanged) {
            // Keep state manageable
            if (processedIds.length > 500) {
                processedIds = processedIds.slice(-500);
            }
            await AppState.findOneAndUpdate(
                { key: 'processed_ids' },
                { value: processedIds },
                { upsert: true }
            );
        }

        return NextResponse.json({
            newCount: newMessages.length,
            alerts: newMessages
        });

    } catch (error) {
        console.error("Notification check error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
