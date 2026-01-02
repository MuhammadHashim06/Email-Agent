
import { auth } from "../../auth";
import { sendEmail } from "../../lib/gmail";
import { NextResponse } from "next/server";

export async function POST(req) {
    const session = await auth();
    if (!session || !session.accessToken) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { to, subject, body, attachments, threadId, inReplyTo, references } = await req.json();

    try {
        const result = await sendEmail(session.accessToken, to, subject, body, {
            attachments,
            threadId,
            inReplyTo,
            references
        });
        return NextResponse.json(result);
    } catch (error) {
        console.error(error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
