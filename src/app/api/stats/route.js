import { NextResponse } from "next/server";
import { connectToDatabase, EmailLog } from "@/app/lib/db.mjs";
import { auth } from "@/app/auth";

export async function GET(req) {
    const session = await auth();
    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        await connectToDatabase();

        // 1. Basic Stats
        const totalEmails = await EmailLog.countDocuments({ emailType: 'incoming' });
        const replied = await EmailLog.countDocuments({ status: 'replied' });
        const skipped = await EmailLog.countDocuments({ status: 'skipped' });
        const errors = await EmailLog.countDocuments({ status: 'error' });

        // 2. Recent Activity Timeline
        const recentLogs = await EmailLog.find({})
            .sort({ processedAt: -1 })
            .limit(20)
            .lean();

        // 3. Chart Data (Last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailyStats = await EmailLog.aggregate([
            {
                $match: {
                    processedAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$processedAt" }
                    },
                    replied: { $sum: { $cond: [{ $eq: ["$status", "replied"] }, 1, 0] } },
                    skipped: { $sum: { $cond: [{ $eq: ["$status", "skipped"] }, 1, 0] } },
                    errors: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        return NextResponse.json({
            stats: {
                totalEmails,
                replied,
                skipped,
                errors
            },
            timeline: recentLogs,
            chartData: dailyStats.map(item => ({
                date: item._id,
                replied: item.replied,
                skipped: item.skipped,
                errors: item.errors
            }))
        });

    } catch (error) {
        console.error("Failed to fetch stats:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
