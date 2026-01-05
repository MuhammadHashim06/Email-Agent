import "dotenv/config";
import { connectToDatabase, AppState, EmailLog, User } from "./src/app/lib/db.mjs";

async function debug() {
    await connectToDatabase();

    const usersCount = await User.countDocuments({});
    console.log(`Users count: ${usersCount}`);

    const stateDocs = await AppState.find({ key: 'processed_ids' });
    console.log(`AppState 'processed_ids' count: ${stateDocs.length}`);
    if (stateDocs.length > 0) {
        console.log(`AppState value length: ${stateDocs[0].value?.length}`);
    }

    const checkpointDoc = await AppState.findOne({ key: 'last_fetch_checkpoint' });
    if (checkpointDoc) {
        console.log(`Last Fetch Checkpoint: ${new Date(checkpointDoc.value).toISOString()} (${checkpointDoc.value})`);
    } else {
        console.log("Last Fetch Checkpoint: NOT SET");
    }

    const logsCount = await EmailLog.countDocuments({});
    console.log(`Total EmailLogs: ${logsCount}`);

    const repliedLogs = await EmailLog.find({ status: 'replied' }).sort({ updatedAt: -1 }).limit(5);
    console.log("Recent Replied Logs:");
    repliedLogs.forEach(l => {
        console.log(`${l.messageId} | ${l.updatedAt.toISOString()} | ${l.subject.substring(0, 30)}`);
    });

    process.exit(0);
}

debug().catch(err => {
    console.error(err);
    process.exit(1);
});
