import "dotenv/config";
import { connectToDatabase, AppState, EmailLog, User } from "./src/app/lib/db.mjs";

async function debug() {
    await connectToDatabase();

    console.log("=== USER DIAGNOSTICS ===");
    const users = await User.find({});
    for (const u of users) {
        console.log(`User in DB: "${u.email}" (ID: ${u._id})`);
    }

    console.log("\n=== RECENT EMAIL LOGS (Last 15) ===");
    const logs = await EmailLog.find({}).sort({ createdAt: -1 }).limit(15);
    for (const l of logs) {
        console.log(`Thread: ${l.threadId} | MsgID: ${l.messageId} | Status: ${l.status}`);
        console.log(`  From: ${l.from}`);
        console.log(`  Subj: ${l.subject}`);
        console.log(`  Snip: ${l.snippet?.substring(0, 100)}`);
        console.log(`  Updated: ${l.updatedAt.toISOString()}`);
        console.log("-----------------------------------------");
    }

    console.log("\n=== APPSTATE CHECK ===");
    const states = await AppState.find({ key: 'processed_ids' });
    console.log(`Found ${states.length} 'processed_ids' documents.`);
    if (states[0]) {
        const count = states[0].value?.length || 0;
        console.log(`Total IDs in first doc: ${count}`);
    }

    process.exit(0);
}

debug().catch(err => {
    console.error(err);
    process.exit(1);
});
