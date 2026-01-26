import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Initialize Supabase Admin Client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

// Helper to handle CORS headers
function corsHeaders() {
    return {
        // 🔒 SECURITY: Only allow your main website
        "Access-Control-Allow-Origin": "https://dreamplaypianos.com",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
}

// Handle the "OPTIONS" pre-flight check (Required for CORS)
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders() });
}

export async function POST(request: Request) {
    try {
        const { email, first_name, last_name, tags } = await request.json();

        // 1. Validate
        if (!email) {
            return NextResponse.json({ error: "Email required" }, { status: 400, headers: corsHeaders() });
        }

        // 2. Default tag if none provided
        const finalTags = tags && Array.isArray(tags) ? tags : ["Website Import"];

        // 3. Check for existing user to merge tags
        const { data: existingUser } = await supabase
            .from("subscribers")
            .select("tags")
            .eq("email", email)
            .single();

        let mergedTags = finalTags;
        if (existingUser?.tags) {
            // Combine old tags with new tags, removing duplicates
            mergedTags = Array.from(new Set([...existingUser.tags, ...finalTags]));
        }

        // 4. Upsert Subscriber
        const { data, error } = await supabase
            .from("subscribers")
            .upsert({
                email,
                first_name,
                last_name,
                tags: mergedTags,
                status: "active"
            }, { onConflict: "email" })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, id: data.id }, { headers: corsHeaders() });

    } catch (error: any) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
    }
}
