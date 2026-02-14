import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    const supabase = await createClient()
    const { subscriberId, firstName, lastName, email } = await request.json()

    if (!subscriberId || !email) {
        return NextResponse.json({ error: "subscriberId and email are required" }, { status: 400 })
    }

    const { error } = await supabase
        .from("subscribers")
        .update({
            first_name: firstName,
            last_name: lastName,
            email: email,
        })
        .eq("id", subscriberId)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
