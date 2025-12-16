import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// Note: In a real production app, use the Service Role Key for backend administration to bypass RLS, 
// or ensure the user's session is passed and RLS allows reading subscribers. 
// For now we will use the Anon key but arguably we should access with Service Role if we are broadcasting to all.
// However, since we don't have SERVICE_ROLE_KEY in context, I will try with standard client. 
// Ideally we should use createClient from @supabase/ssr in an API route to use the user's cookies.

import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: Request) {
    try {
        const cookieStore = cookies()

        // Create a Supabase client with the Auth context of the logged in user
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        cookieStore.set({ name, value, ...options })
                    },
                    remove(name: string, options: CookieOptions) {
                        cookieStore.set({ name, value: "", ...options })
                    },
                },
            }
        )

        const body = await request.json()
        const { campaignId, type, email, fromName, fromEmail } = body

        if (!campaignId || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // 1. Fetch Campaign
        const { data: campaign, error: campaignError } = await supabase
            .from("campaigns")
            .select("*")
            .eq("id", campaignId)
            .single()

        if (campaignError || !campaign) {
            return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
        }

        const subject = campaign.subject_line || "No Subject"
        let htmlContent = campaign.html_content || ""
        const variableValues = campaign.variable_values || {}

        // 2. Compile HTML (Basic Mustache-like replacement)
        // We do a first pass for campaign-level variables. 
        // For broadcast, we might need subscriber-level replacement later (e.g. {{first_name}}), 
        // but the current requirement says "Iterate over keys in campaign.variable_values".

        Object.keys(variableValues).forEach((key) => {
            const regex = new RegExp(`{{${key}}}`, "g")
            htmlContent = htmlContent.replace(regex, variableValues[key])
        })

        // 3. Dispatch
        if (type === "test") {
            if (!email) {
                return NextResponse.json({ error: "Test email required" }, { status: 400 })
            }

            const { data, error } = await resend.emails.send({
                from: `${fromName} <${fromEmail}>`,
                to: [email],
                subject: `[TEST] ${subject}`,
                html: htmlContent,
            })

            if (error) {
                return NextResponse.json({ error }, { status: 500 })
            }

            return NextResponse.json({ success: true, data })
        }
        else if (type === "broadcast") {
            // Fetch Active Subscribers
            const { data: subscribers, error: subError } = await supabase
                .from("subscribers")
                .select("email")
                .eq("status", "active")

            if (subError) {
                return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 })
            }

            if (!subscribers || subscribers.length === 0) {
                return NextResponse.json({ error: "No active subscribers found" }, { status: 400 })
            }

            // Batch Send (Naive loop for now, Resend supports batching but loop is easier to implement for MVP)
            // Ideally use resend.batch.send()
            const batchSize = 100
            const batches = []

            // For now, simpler implementation: Loop and fire promises (beware rate limits)
            // Or better: Use Resend Batch API if possible. 
            // Let's use a simple Promise.all with chunks of 10 to avoid hitting limits too hard.

            const results = []
            const chunk = (arr: any[], size: number) =>
                Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                    arr.slice(i * size, i * size + size)
                )

            const subscriberChunks = chunk(subscribers, 50)

            for (const batch of subscriberChunks) {
                const promises = batch.map(sub =>
                    resend.emails.send({
                        from: `${fromName} <${fromEmail}>`,
                        to: sub.email,
                        subject: subject,
                        html: htmlContent,
                    })
                )
                const batchResults = await Promise.all(promises)
                results.push(...batchResults)
            }

            // Update Campaign Status
            const { error: updateError } = await supabase
                .from("campaigns")
                .update({
                    status: 'completed', // or 'sent' - schema said 'active'|'draft'|'completed' in one file types.ts
                    updated_at: new Date().toISOString()
                })
                .eq("id", campaignId)

            return NextResponse.json({ success: true, count: subscribers.length })
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 })

    } catch (error: any) {
        console.error("API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
