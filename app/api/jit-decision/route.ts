import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";

/**
 * Fires a jit.decision event to approve or reject an AI-generated draft.
 * Used by the Approvals Inbox UI.
 */
export async function POST(req: Request) {
    try {
        const { campaignId, decision } = await req.json();

        if (!campaignId || !["approved", "rejected"].includes(decision)) {
            return NextResponse.json(
                { error: "Invalid request. Need campaignId and decision (approved|rejected)." },
                { status: 400 }
            );
        }

        await inngest.send({
            name: "jit.decision",
            data: { campaignId, decision },
        });

        return NextResponse.json({ success: true, decision });
    } catch (error: any) {
        console.error("JIT Decision error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
