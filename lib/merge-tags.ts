/**
 * Unified Merge Tags — centralized variable replacement for all email sends.
 *
 * Three categories of merge tags:
 *
 * 1. SUBSCRIBER — pulled from the subscriber row (e.g. first_name, email)
 *    Falls back to the configured default_value if the field is empty.
 *
 * 2. GLOBAL — shared values across all emails (e.g. privacy_url, homepage_url)
 *    Always uses the default_value from the merge_tags table.
 *
 * 3. DYNAMIC — generated at send time and injected via the `dynamicVars` argument
 *    (e.g. discount_code, unsubscribe_url). These are documented in the table
 *    but their values come from runtime, not the database.
 *
 * Used by all send paths:
 *   - app/api/send/route.ts (campaign send)
 *   - inngest/functions/send-campaign.ts (inngest campaign send)
 *   - app/api/webhooks/subscribe/route.ts (trigger execution)
 *   - lib/chains/sender.ts (chain sender)
 */

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
)

export interface MergeTag {
    id: string
    tag: string            // e.g. "first_name", "privacy_url", "discount_code"
    field_label: string    // e.g. "First Name", "Privacy Policy", "Discount Code"
    subscriber_field: string // subscriber column name (only for category=subscriber)
    default_value: string  // fallback or static value
    category: "subscriber" | "global" | "dynamic"
    created_at: string
}

// ── Cache merge tag defaults so we don't hit the DB on every email ────
let _cache: { data: MergeTag[]; ts: number } | null = null
const CACHE_TTL = 60_000 // 1 minute

/**
 * Fetch all merge tags from the database (cached for 1 minute).
 */
export async function getAllMergeTags(): Promise<MergeTag[]> {
    const now = Date.now()
    if (_cache && now - _cache.ts < CACHE_TTL) return _cache.data

    try {
        const { data, error } = await supabase
            .from("merge_tags")
            .select("*")
            .order("created_at", { ascending: true })

        if (error || !data || data.length === 0) {
            return BUILT_IN_FALLBACK
        }

        _cache = { data, ts: now }
        return data
    } catch {
        return BUILT_IN_FALLBACK
    }
}

/**
 * Apply ALL merge tags to HTML content.
 *
 * @param html       — raw HTML with {{variable}} placeholders
 * @param subscriber — subscriber row data (for category=subscriber tags)
 * @param dynamicVars — runtime values like { discount_code, unsubscribe_url }
 */
export async function applyAllMergeTags(
    html: string,
    subscriber: Record<string, any> = {},
    dynamicVars: Record<string, string> = {}
): Promise<string> {
    const tags = await getAllMergeTags()
    let result = html

    for (const tag of tags) {
        const regex = new RegExp(`\\{\\{${tag.tag}\\}\\}`, "g")

        let value: string

        switch (tag.category) {
            case "subscriber":
                // Pull from subscriber row, fallback to default
                value = subscriber[tag.subscriber_field] || tag.default_value
                break

            case "global":
                // Always use the configured default_value
                value = tag.default_value
                break

            case "dynamic":
                // Use runtime-injected value, fallback to default
                value = dynamicVars[tag.tag] || tag.default_value
                break

            default:
                value = tag.default_value
        }

        result = result.replace(regex, value)
    }

    // Handle unsubscribe URL aliases (some templates use different names)
    if (dynamicVars.unsubscribe_url) {
        result = result
            .replace(/\{\{unsubscribe_link_url\}\}/g, dynamicVars.unsubscribe_url)
            .replace(/\{\{unsubscribe_link\}\}/g, dynamicVars.unsubscribe_url)
    }

    return result
}

// ── Backwards-compatible wrapper (used by send/route.ts and subscribe/route.ts) ──
export function applyMergeTags(
    html: string,
    subscriber: Record<string, any>,
    _mergeDefaults: Record<string, string>
): string {
    // This is a sync wrapper — the callers that use this need updating to async.
    // For now, kept for compilation but callers should migrate to applyAllMergeTags.
    let result = html
    for (const [tag, defaultValue] of Object.entries(_mergeDefaults)) {
        const subscriberField = BUILT_IN_FALLBACK.find(t => t.tag === tag)?.subscriber_field || tag
        const value = subscriber[subscriberField] || defaultValue
        result = result.replace(new RegExp(`\\{\\{${tag}\\}\\}`, "g"), value)
    }
    if (subscriber._unsubscribe_url) {
        result = result
            .replace(/\{\{unsubscribe_url\}\}/g, subscriber._unsubscribe_url)
            .replace(/\{\{unsubscribe_link_url\}\}/g, subscriber._unsubscribe_url)
            .replace(/\{\{unsubscribe_link\}\}/g, subscriber._unsubscribe_url)
    }
    return result
}

/** Legacy sync helper - still used by getMergeTagDefaults callers */
export async function getMergeTagDefaults(): Promise<Record<string, string>> {
    const tags = await getAllMergeTags()
    const defaults: Record<string, string> = {}
    for (const t of tags) {
        if (t.category === "subscriber") {
            defaults[t.tag] = t.default_value
        }
    }
    return defaults
}

// ── Fallback if DB is empty ──────────────────────────────────────────
const BUILT_IN_FALLBACK: MergeTag[] = [
    { id: "", tag: "first_name", field_label: "First Name", subscriber_field: "first_name", default_value: "Musical Family", category: "subscriber", created_at: "" },
    { id: "", tag: "last_name", field_label: "Last Name", subscriber_field: "last_name", default_value: "", category: "subscriber", created_at: "" },
    { id: "", tag: "email", field_label: "Email Address", subscriber_field: "email", default_value: "", category: "subscriber", created_at: "" },
    { id: "", tag: "subscriber_id", field_label: "Subscriber ID", subscriber_field: "id", default_value: "", category: "subscriber", created_at: "" },
    { id: "", tag: "location_city", field_label: "City", subscriber_field: "location_city", default_value: "", category: "subscriber", created_at: "" },
    { id: "", tag: "location_country", field_label: "Country", subscriber_field: "location_country", default_value: "", category: "subscriber", created_at: "" },
    { id: "", tag: "discount_code", field_label: "Discount Code", subscriber_field: "", default_value: "", category: "dynamic", created_at: "" },
    { id: "", tag: "unsubscribe_url", field_label: "Unsubscribe URL", subscriber_field: "", default_value: "", category: "dynamic", created_at: "" },
]
