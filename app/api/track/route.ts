import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

// 1. Smart CORS (Allow your website to talk to this API)
const allowedOrigins = ["https://dreamplaypianos.com", "https://www.dreamplaypianos.com"];

function getCorsHeaders(request: Request) {
    const origin = request.headers.get("origin") || "";
    const allow = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    return {
        "Access-Control-Allow-Origin": allow,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}

export async function OPTIONS(request: Request) {
    return NextResponse.json({}, { headers: getCorsHeaders(request) });
}

export async function POST(request: Request) {
    try {
        const { subscriber_id, campaign_id, type, url, duration, ip } = await request.json();

        // 2. Validate
        if (!subscriber_id) return NextResponse.json({ error: "No ID" }, { status: 400 });

        // 3. Log the Event
        await supabase.from("subscriber_events").insert({
            subscriber_id,
            campaign_id, // Optional (null for organic website visits)
            type, // 'open', 'click', 'page_view', 'session_end'
            url,
            ip_address: ip,
            metadata: duration ? { duration_seconds: duration } : {}
        });

        // 4. Browse Abandonment Triggers
        if (type === "session_end" && duration > 10 && subscriber_id) {
            if (url?.includes("/customize")) {
                await inngest.send({
                    name: "chain.abandon.customize",
                    data: { subscriberId: subscriber_id, url, duration },
                });
            }
        }

        return NextResponse.json({ success: true }, { headers: getCorsHeaders(request) });

    } catch (error) {
        return NextResponse.json({ error: "Track failed" }, { status: 500 });
    }
}
