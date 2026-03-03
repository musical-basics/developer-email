/**
 * Merge Tags — centralized subscriber field replacement for emails.
 *
 * This module defines the available merge tags, fetches their default values
 * from the `merge_tags` table, and applies them to HTML content.
 *
 * Used by both:
 *   - Campaign send (app/api/send/route.ts)
 *   - Trigger execution (app/api/webhooks/subscribe/route.ts)
 */

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
)

export interface MergeTag {
    id: string
    tag: string           // e.g. "first_name"
    field_label: string   // e.g. "First Name"
    subscriber_field: string  // e.g. "first_name" (column in subscribers table)
    default_value: string // e.g. "Musical Family"
    created_at: string
}

// Built-in merge tags that map to subscriber columns
export const BUILT_IN_MERGE_TAGS: Omit<MergeTag, "id" | "created_at">[] = [
    { tag: "first_name", field_label: "First Name", subscriber_field: "first_name", default_value: "Musical Family" },
    { tag: "last_name", field_label: "Last Name", subscriber_field: "last_name", default_value: "" },
    { tag: "email", field_label: "Email Address", subscriber_field: "email", default_value: "" },
    { tag: "subscriber_id", field_label: "Subscriber ID", subscriber_field: "id", default_value: "" },
    { tag: "location_city", field_label: "City", subscriber_field: "location_city", default_value: "" },
    { tag: "location_country", field_label: "Country", subscriber_field: "location_country", default_value: "" },
]

/**
 * Fetch merge tag defaults from the database.
 * Falls back to built-in defaults if the table doesn't exist or is empty.
 */
export async function getMergeTagDefaults(): Promise<Record<string, string>> {
    try {
        const { data, error } = await supabase
            .from("merge_tags")
            .select("tag, default_value")

        if (error || !data || data.length === 0) {
            // Fallback to built-in defaults
            const defaults: Record<string, string> = {}
            for (const t of BUILT_IN_MERGE_TAGS) {
                defaults[t.tag] = t.default_value
            }
            return defaults
        }

        const defaults: Record<string, string> = {}
        for (const row of data) {
            defaults[row.tag] = row.default_value
        }
        return defaults
    } catch {
        const defaults: Record<string, string> = {}
        for (const t of BUILT_IN_MERGE_TAGS) {
            defaults[t.tag] = t.default_value
        }
        return defaults
    }
}

/**
 * Apply merge tags to HTML content using subscriber data.
 *
 * Replaces all {{tag}} placeholders with the subscriber's field value,
 * falling back to the configured default value if the field is empty.
 */
export function applyMergeTags(
    html: string,
    subscriber: Record<string, any>,
    mergeTagDefaults: Record<string, string>
): string {
    let result = html

    // Replace all known merge tags
    for (const [tag, defaultValue] of Object.entries(mergeTagDefaults)) {
        const subscriberField = BUILT_IN_MERGE_TAGS.find(t => t.tag === tag)?.subscriber_field || tag
        const value = subscriber[subscriberField] || defaultValue
        const regex = new RegExp(`{{${tag}}}`, "g")
        result = result.replace(regex, value)
    }

    // Also handle unsubscribe URL variants
    if (subscriber._unsubscribe_url) {
        result = result
            .replace(/{{unsubscribe_url}}/g, subscriber._unsubscribe_url)
            .replace(/{{unsubscribe_link_url}}/g, subscriber._unsubscribe_url)
            .replace(/{{unsubscribe_link}}/g, subscriber._unsubscribe_url)
    }

    return result
}
