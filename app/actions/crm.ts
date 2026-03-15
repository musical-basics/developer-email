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

export interface CRMScoringConfig {
    // Base points per event type
    points_conversion: number
    points_checkout_page: number
    points_click: number
    points_page_view: number
    points_open: number
    points_session_max: number // max points from session duration

    // Time decay multipliers
    decay_recent_days: number       // "recent" window in days
    decay_recent_multiplier: number // multiplier for events within recent window
    decay_mid_days: number          // "mid" window in days
    decay_mid_multiplier: number    // multiplier for events within mid window
    decay_old_multiplier: number    // multiplier for older events

    // Tag boosts
    tag_boosts: { tag: string; boost: number }[]

    // Filtering
    min_score: number
    max_score: number | null        // null = no upper limit
    exclude_tags: string[]
    include_hot_tags: string[]      // always include if they have these tags, regardless of score

    // Display
    event_lookback_days: number     // how far back to look for events
}

export const DEFAULT_CRM_CONFIG: CRMScoringConfig = {
    points_conversion: 50,
    points_checkout_page: 20,
    points_click: 10,
    points_page_view: 2,
    points_open: 1,
    points_session_max: 20,

    decay_recent_days: 3,
    decay_recent_multiplier: 2.0,
    decay_mid_days: 14,
    decay_mid_multiplier: 1.0,
    decay_old_multiplier: 0.2,

    tag_boosts: [
        { tag: "VIP Account", boost: 30 },
        { tag: "$300 Off Lead", boost: 40 },
    ],

    min_score: 5,
    max_score: null,
    exclude_tags: ["Purchased", "Test Account"],
    include_hot_tags: ["VIP Account", "$300 Off Lead", "Free Shipping Lead", "Hesitated at Checkout"],

    event_lookback_days: 30,
}

/**
 * Fetches CRM leads with configurable scoring.
 * All scoring logic runs in JS for full configurability.
 */
export async function getCRMLeads(config: CRMScoringConfig = DEFAULT_CRM_CONFIG): Promise<CRMLead[]> {
    const supabase = await createClient()

    // 1. Get active subscribers
    const { data: subscribers, error: subError } = await supabase
        .from("subscribers")
        .select("id, email, first_name, last_name, tags, status")
        .eq("status", "active")

    if (subError || !subscribers) {
        console.error("[CRM] Failed to fetch subscribers:", subError)
        return []
    }

    // 2. Get events within lookback window
    const lookbackDate = new Date()
    lookbackDate.setDate(lookbackDate.getDate() - config.event_lookback_days)

    const { data: events, error: evError } = await supabase
        .from("subscriber_events")
        .select("subscriber_id, type, url, created_at, metadata")
        .gte("created_at", lookbackDate.toISOString())
        .not("subscriber_id", "is", null)

    if (evError) {
        console.error("[CRM] Failed to fetch events:", evError)
        return []
    }

    // 3. Group events by subscriber
    const now = Date.now()
    const recentMs = config.decay_recent_days * 24 * 60 * 60 * 1000
    const midMs = config.decay_mid_days * 24 * 60 * 60 * 1000

    const eventsBySubscriber = new Map<string, typeof events>()
    for (const e of events || []) {
        if (!e.subscriber_id) continue
        const arr = eventsBySubscriber.get(e.subscriber_id) || []
        arr.push(e)
        eventsBySubscriber.set(e.subscriber_id, arr)
    }

    // 4. Score each subscriber
    const leads: CRMLead[] = []
    const checkoutPatterns = ["/customize", "/buy", "/reserve", "/checkout"]

    for (const sub of subscribers) {
        // Exclude filtered tags
        if (sub.tags?.some((t: string) => config.exclude_tags.includes(t))) continue

        const subEvents = eventsBySubscriber.get(sub.id) || []
        let score = 0
        let lastSeen: Date | null = null
        const pages = new Set<string>()

        for (const e of subEvents) {
            const eventTime = new Date(e.created_at).getTime()
            const age = now - eventTime

            // Base points
            let basePoints = 0
            if (e.type?.startsWith("conversion_")) basePoints = config.points_conversion
            else if (e.type === "page_view" && checkoutPatterns.some(p => e.url?.includes(p))) basePoints = config.points_checkout_page
            else if (e.type === "session_end") {
                const dur = Number(e.metadata?.duration_seconds) || 0
                basePoints = Math.min(dur / 10, config.points_session_max)
            }
            else if (e.type === "click") basePoints = config.points_click
            else if (e.type === "page_view") basePoints = config.points_page_view
            else if (e.type === "open") basePoints = config.points_open

            // Time decay
            let decay = config.decay_old_multiplier
            if (age < recentMs) decay = config.decay_recent_multiplier
            else if (age < midMs) decay = config.decay_mid_multiplier

            score += basePoints * decay

            // Track last seen
            const created = new Date(e.created_at)
            if (!lastSeen || created > lastSeen) lastSeen = created

            if (e.type === "page_view" && e.url) pages.add(e.url)
        }

        // Tag boosts
        for (const { tag, boost } of config.tag_boosts) {
            if (sub.tags?.includes(tag)) score += boost
        }

        // Filtering
        const hasHotTag = sub.tags?.some((t: string) => config.include_hot_tags.includes(t))
        if (score <= config.min_score && !hasHotTag) continue
        if (config.max_score !== null && score > config.max_score) continue

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

    leads.sort((a, b) => b.engagement_score - a.engagement_score)
    return leads.slice(0, 200)
}
