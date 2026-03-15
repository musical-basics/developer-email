"use server"

import { createClient } from "@/lib/supabase/server"

export interface CRMLead {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    tags: string[]
    status: string
    engagement_score: number
    last_seen_at: string | null
    recent_pages: string[] | null
}

/**
 * Fetches CRM leads using the get_crm_leads() Postgres function.
 * Falls back to a manual query if the function doesn't exist yet.
 */
export async function getCRMLeads(): Promise<CRMLead[]> {
    const supabase = await createClient()

    // Try the optimized Postgres function first
    const { data, error } = await supabase.rpc("get_crm_leads")

    if (error) {
        console.error("[CRM] rpc get_crm_leads failed, using fallback:", error.message)
        return getCRMLeadsFallback()
    }

    return (data || []) as CRMLead[]
}

/**
 * Fallback: compute engagement scores in JS if the Postgres function isn't installed yet.
 * Less efficient but functional.
 */
async function getCRMLeadsFallback(): Promise<CRMLead[]> {
    const supabase = await createClient()

    // 1. Get active subscribers with high-intent tags OR any events
    const { data: subscribers, error: subError } = await supabase
        .from("subscribers")
        .select("id, email, first_name, last_name, tags, status")
        .eq("status", "active")

    if (subError || !subscribers) {
        console.error("[CRM] Failed to fetch subscribers:", subError)
        return []
    }

    // 2. Get all events from the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: events, error: evError } = await supabase
        .from("subscriber_events")
        .select("subscriber_id, type, url, created_at, metadata")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .not("subscriber_id", "is", null)

    if (evError) {
        console.error("[CRM] Failed to fetch events:", evError)
        return []
    }

    // 3. Compute scores in JS
    const now = Date.now()
    const threeDays = 3 * 24 * 60 * 60 * 1000
    const fourteenDays = 14 * 24 * 60 * 60 * 1000

    const eventsBySubscriber = new Map<string, typeof events>()
    for (const e of events || []) {
        if (!e.subscriber_id) continue
        const arr = eventsBySubscriber.get(e.subscriber_id) || []
        arr.push(e)
        eventsBySubscriber.set(e.subscriber_id, arr)
    }

    const leads: CRMLead[] = []
    const purchasedTag = "Purchased"
    const hotTags = ["VIP Account", "$300 Off Lead", "Free Shipping Lead", "Hesitated at Checkout"]

    for (const sub of subscribers) {
        // Skip purchased
        if (sub.tags?.includes(purchasedTag)) continue

        const subEvents = eventsBySubscriber.get(sub.id) || []
        let score = 0
        let lastSeen: Date | null = null
        const pages = new Set<string>()

        for (const e of subEvents) {
            const eventTime = new Date(e.created_at).getTime()
            const age = now - eventTime

            // Base points
            let basePoints = 0
            if (e.type?.startsWith("conversion_")) basePoints = 50
            else if (e.type === "page_view" && e.url?.includes("/customize")) basePoints = 20
            else if (e.type === "page_view" && e.url?.includes("/buy")) basePoints = 20
            else if (e.type === "page_view" && e.url?.includes("/reserve")) basePoints = 20
            else if (e.type === "session_end") {
                const dur = Number(e.metadata?.duration_seconds) || 0
                basePoints = Math.min(dur / 10, 20)
            }
            else if (e.type === "click") basePoints = 10
            else if (e.type === "page_view") basePoints = 2
            else if (e.type === "open") basePoints = 1

            // Time decay
            let decay = 0.2
            if (age < threeDays) decay = 2.0
            else if (age < fourteenDays) decay = 1.0

            score += basePoints * decay

            // Track last seen
            const created = new Date(e.created_at)
            if (!lastSeen || created > lastSeen) lastSeen = created

            // Track pages
            if (e.type === "page_view" && e.url) pages.add(e.url)
        }

        // Tag boosts
        if (sub.tags?.includes("VIP Account")) score += 30
        if (sub.tags?.includes("$300 Off Lead")) score += 40

        // Filter: only return hot leads
        const hasHotTag = sub.tags?.some((t: string) => hotTags.includes(t))
        if (score <= 15 && !hasHotTag) continue

        leads.push({
            id: sub.id,
            email: sub.email,
            first_name: sub.first_name,
            last_name: sub.last_name,
            tags: sub.tags || [],
            status: sub.status,
            engagement_score: Math.round(score * 10) / 10,
            last_seen_at: lastSeen?.toISOString() || null,
            recent_pages: Array.from(pages),
        })
    }

    // Sort by score descending, limit 100
    leads.sort((a, b) => b.engagement_score - a.engagement_score)
    return leads.slice(0, 100)
}
