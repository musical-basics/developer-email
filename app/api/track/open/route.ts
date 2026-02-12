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
        // Check if this subscriber already opened this campaign
        const { data: existing } = await supabase
            .from("subscriber_events")
            .select("id")
            .eq("type", "open")
            .eq("campaign_id", campaignId)
            .eq("subscriber_id", subscriberId)
            .limit(1)
            .maybeSingle();

        // Always log the raw event
        await supabase.from("subscriber_events").insert({
            type: "open",
            campaign_id: campaignId,
            subscriber_id: subscriberId,
        });

        // Only increment the campaign counter for FIRST open per subscriber
        if (!existing) {
            const { error: rpcError } = await supabase.rpc('increment_opens', { row_id: campaignId });
            if (rpcError) {
                // Fallback: manual increment
                const { data: campaign } = await supabase.from('campaigns').select('total_opens').eq('id', campaignId).single();
                if (campaign) {
                    await supabase.from('campaigns').update({ total_opens: (campaign.total_opens || 0) + 1 }).eq('id', campaignId);
                }
            }
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
