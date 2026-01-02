import { auth } from "../../auth";
import { getThread } from "../../lib/gmail";
import { NextResponse } from "next/server";

export async function GET(req) {
    const session = await auth();
    if (!session || !session.accessToken) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return new NextResponse("Missing thread ID", { status: 400 });
    }

    try {
        const result = await getThread(session.accessToken, id);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching thread:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
