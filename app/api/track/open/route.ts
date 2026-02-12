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
        // Log the open event (await to ensure execution)
        const { error: logError } = await supabase.from("subscriber_events").insert({
            type: "open",
            campaign_id: campaignId,
            subscriber_id: subscriberId,
        });

        if (logError) console.error("Failed to log open:", logError);

        // Increment campaign open count
        const { error: rpcError } = await supabase.rpc('increment_opens', { row_id: campaignId });

        if (rpcError) {
            console.error("Failed to increment opens:", rpcError);
            // Failover: Try manual increment (racey but better than nothing)
            // Only do this if RPC failed (likely due to missing function)
            /* 
            const { data: campaign } = await supabase.from('campaigns').select('total_opens').eq('id', campaignId).single();
            if (campaign) {
                await supabase.from('campaigns').update({ total_opens: (campaign.total_opens || 0) + 1 }).eq('id', campaignId);
            }
            */
        }
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
