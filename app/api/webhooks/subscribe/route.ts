import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Use SERVICE_KEY to bypass RLS (Row Level Security) since this request comes from your server/website
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: Request) {
    try {
        const { email, first_name, last_name, tags } = await request.json();

        // 1. Validate
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

        // 2. Upsert (Insert or Update if exists)
        const { data, error } = await supabase
            .from("subscribers")
            .upsert({
                email,
                first_name,
                last_name,
                tags: tags || ["Website Import"],
                status: "active"
            }, { onConflict: "email" })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, id: data.id });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
