import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("u");
    const campaignId = searchParams.get("c");
    const subscriberId = searchParams.get("s");

    if (!url) return new NextResponse("Missing URL", { status: 400 });

    if (campaignId && subscriberId) {
        // Log the click event (fire and forget)
        supabase.from("subscriber_events").insert({
            type: "click",
            campaign_id: campaignId,
            subscriber_id: subscriberId,
            url: url
        }).then(({ error }) => {
            if (error) console.error("Failed to log click:", error);
        });

        // Increment campaign click count (if the RPC exists)
        supabase.rpc('increment_clicks', { row_id: campaignId });
    }

    // Prepare the destination URL
    let destination: URL;
    try {
        destination = new URL(url);

        // Pass the tracking IDs to the destination so your website knows who they are
        // Only append if it's a relative path to your domain or your domain itself
        const allowedDomains = ["dreamplaypianos.com", "localhost"];
        const isAllowedDomain = allowedDomains.some(domain => destination.hostname.includes(domain));

        if (isAllowedDomain) {
            if (subscriberId) destination.searchParams.set("sid", subscriberId);
            if (campaignId) destination.searchParams.set("cid", campaignId);
        }
    } catch (e) {
        // Fallback for relative URLs or malformed URLs
        return NextResponse.redirect(url);
    }

    return NextResponse.redirect(destination.toString());
}
