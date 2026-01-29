import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("c");
    const subscriberId = searchParams.get("s");

    if (campaignId && subscriberId) {
        // Log the open event (fire and forget)
        supabase.from("subscriber_events").insert({
            type: "open",
            campaign_id: campaignId,
            subscriber_id: subscriberId,
        }).then(({ error }) => {
            if (error) console.error("Failed to log open:", error);
        });

        // Increment campaign open count (if the RPC exists)
        supabase.rpc('increment_opens', { row_id: campaignId });
    }

    // Return a 1x1 transparent GIF
    const pixel = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
    );

    return new NextResponse(pixel, {
        headers: {
            "Content-Type": "image/gif",
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    });
}
