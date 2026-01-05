import "dotenv/config";
import { connectToDatabase, EmailLog } from "./src/app/lib/db.mjs";

async function checkIndexes() {
    await connectToDatabase();

    console.log("=== CHECKING INDEXES FOR EmailLog ===");
    try {
        const indexes = await EmailLog.collection.getIndexes();
        console.log("Existing indexes:", JSON.stringify(indexes, null, 2));

        // Let's also try to force create the unique index if it's missing
        console.log("\nAttempting to ensure unique index on messageId...");
        await EmailLog.collection.createIndex({ messageId: 1 }, { unique: true });
        console.log("Unique index ensured.");
    } catch (err) {
        console.error("Error with indexes:", err);
    }

    process.exit(0);
}

checkIndexes().catch(err => {
    console.error(err);
    process.exit(1);
});
