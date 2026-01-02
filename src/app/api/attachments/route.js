
import { auth } from "../../auth";
import { getAttachment } from "../../lib/gmail";
import { NextResponse } from "next/server";

export async function GET(req) {
    const session = await auth();
    if (!session || !session.accessToken) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('messageId');
    const attachmentId = searchParams.get('attachmentId');
    const filename = searchParams.get('filename') || 'attachment';

    if (!messageId || !attachmentId) {
        return new NextResponse("Missing parameters", { status: 400 });
    }

    try {
        const result = await getAttachment(session.accessToken, messageId, attachmentId);

        // Convert base64url to base64
        const base64 = result.data.replace(/-/g, '+').replace(/_/g, '/');
        const buffer = Buffer.from(base64, 'base64');

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });
    } catch (error) {
        console.error(error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
