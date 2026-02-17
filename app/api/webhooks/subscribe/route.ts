import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

// 1. Define your Safe List
const allowedOrigins = [
    "https://dreamplaypianos.com",
    "https://www.dreamplaypianos.com"
];

// 2. Helper to generate dynamic headers based on who is asking
function getCorsHeaders(request: Request) {
    const origin = request.headers.get("origin");

    // If the requester is in our safe list, let them in. 
    // Otherwise, default to the main domain (which effectively blocks them).
    const allowOrigin = (origin && allowedOrigins.includes(origin))
        ? origin
        : allowedOrigins[0];

    return {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
}

export async function OPTIONS(request: Request) {
    return NextResponse.json({}, { headers: getCorsHeaders(request) });
}

export async function POST(request: Request) {
    try {
        const { email, first_name, last_name, tags, city, country, ip_address } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: "Email required" },
                { status: 400, headers: getCorsHeaders(request) }
            );
        }

        const finalTags = tags && Array.isArray(tags) ? tags : ["Website Import"];

        // Check for existing user to merge tags
        const { data: existingUser } = await supabase
            .from("subscribers")
            .select("tags")
            .eq("email", email)
            .single();

        let mergedTags = finalTags;
        if (existingUser?.tags) {
            mergedTags = Array.from(new Set([...existingUser.tags, ...finalTags]));
        }

        const { data, error } = await supabase
            .from("subscribers")
            .upsert({
                email,
                first_name: first_name || "",
                last_name: last_name || "",
                tags: mergedTags,
                status: "active",
                // 📍 NEW: Location Data
                location_city: city,
                location_country: country,
                ip_address: ip_address
            }, { onConflict: "email" })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(
            { success: true, id: data.id },
            { headers: getCorsHeaders(request) }
        );

    } catch (error: any) {
        console.error("Webhook Error:", error);
        return NextResponse.json(
            { error: error.message },
            { status: 500, headers: getCorsHeaders(request) }
        );
    }
}
