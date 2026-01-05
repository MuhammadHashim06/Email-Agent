import { auth } from "../../../auth";
import { NextResponse } from "next/server";
import { connectToDatabase, Notification } from "../../../lib/db.mjs";

export async function GET(req) {
    const session = await auth();
    if (!session || !session.user || !session.user.email) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        await connectToDatabase();

        // Fetch unread notifications for this user
        const notifications = await Notification.find({
            userEmail: session.user.email,
            isRead: false
        }).sort({ createdAt: 1 }); // Oldest first to show in order, or desc for newest

        if (notifications.length === 0) {
            return NextResponse.json({
                newCount: 0,
                alerts: []
            });
        }

        // Format for frontend
        const alerts = notifications.map(n => ({
            id: n._id.toString(),
            subject: n.message, // Dashboard expects 'subject'
            from: 'System',     // or extract from message if needed
            snippet: n.message
        }));

        // IMPORTANT: Mark them as read so they don't show up again in the next poll
        // If the frontend crashes, these are lost to the "toast" view, but that's standard for toasts.
        // Alternatively, we could wait for a POST /ack from frontend, but this is simpler.
        const ids = notifications.map(n => n._id);
        await Notification.updateMany(
            { _id: { $in: ids } },
            { $set: { isRead: true } }
        );

        return NextResponse.json({
            newCount: alerts.length,
            alerts: alerts
        });

    } catch (error) {
        console.error("Notification check error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
