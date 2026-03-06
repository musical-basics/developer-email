"use server"

import { createClient } from "@/lib/supabase/server"
import { renderTemplate } from "@/lib/render-template"
import { applyAllMergeTagsWithLog, MergeTagLog } from "@/lib/merge-tags"

export interface MergeTagLogData {
    subscriber_id: string
    subscriber_email: string
    sent_at: string
    merge_tag_log: MergeTagLog | null
}

/**
 * Fetch post-send merge tag logs from sent_history.
 */
export async function getMergeTagLogs(campaignId: string): Promise<MergeTagLogData[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("sent_history")
        .select("subscriber_id, sent_at, merge_tag_log, subscribers ( email )")
        .eq("campaign_id", campaignId)
        .not("merge_tag_log", "is", null)
        .order("sent_at", { ascending: false })
        .limit(50)

    if (error || !data) {
        console.error("Error fetching merge tag logs:", error)
        return []
    }

    return data.map((row: any) => ({
        subscriber_id: row.subscriber_id,
        subscriber_email: (row.subscribers as any)?.email || "Unknown",
        sent_at: row.sent_at,
        merge_tag_log: row.merge_tag_log,
    }))
}

/**
 * Dry-run merge tag resolution WITHOUT sending.
 * Simulates the full pipeline: renderTemplate → applyAllMergeTagsWithLog
 * Uses the locked subscriber (or first active) to produce realistic values.
 */
export async function dryRunMergeTags(campaignId: string): Promise<{
    log: MergeTagLog
    subscriber_email: string
} | null> {
    const supabase = await createClient()

    // 1. Fetch the campaign
    const { data: campaign, error: campErr } = await supabase
        .from("campaigns")
        .select("html_content, variable_values, subject_line")
        .eq("id", campaignId)
        .single()

    if (campErr || !campaign || !campaign.html_content) {
        console.error("dryRunMergeTags: campaign fetch failed", campErr)
        return null
    }

    // 2. Find a subscriber to simulate against
    const lockedSubscriberIds: string[] | undefined = campaign.variable_values?.subscriber_ids
    const lockedSubscriberId = campaign.variable_values?.subscriber_id
    let subscriber: any = null

    if (lockedSubscriberIds?.length) {
        const { data } = await supabase
            .from("subscribers")
            .select("*")
            .eq("id", lockedSubscriberIds[0])
            .single()
        subscriber = data
    } else if (lockedSubscriberId) {
        const { data } = await supabase
            .from("subscribers")
            .select("*")
            .eq("id", lockedSubscriberId)
            .single()
        subscriber = data
    } else {
        const { data } = await supabase
            .from("subscribers")
            .select("*")
            .eq("status", "active")
            .limit(1)
            .single()
        subscriber = data
    }

    if (!subscriber) {
        console.error("dryRunMergeTags: no subscriber found for simulation")
        return null
    }

    // 3. Render template variables (same as send route)
    const subscriberVarNames = ["first_name", "last_name", "email", "unsubscribe_url", "unsubscribe_link_url", "unsubscribe_link"]
    const globalAssets = Object.fromEntries(
        Object.entries(campaign.variable_values || {}).filter(([key]) => !subscriberVarNames.includes(key))
    ) as Record<string, string>
    const renderedHtml = renderTemplate(campaign.html_content, globalAssets)

    // 4. Build dynamic vars (simulated)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://email.dreamplaypianos.com"
    const unsubscribeUrl = `${baseUrl}/unsubscribe?s=${subscriber.id}&c=${campaignId}`

    const dynamicVars: Record<string, string> = {
        unsubscribe_url: unsubscribeUrl,
    }

    // Simulate discount code if configured
    const discountCode = campaign.variable_values?.discount_code
    if (discountCode) {
        dynamicVars.discount_code = discountCode
    }

    // 5. Run the full merge tag resolution
    const { log } = await applyAllMergeTagsWithLog(renderedHtml, subscriber, dynamicVars)

    return {
        log,
        subscriber_email: subscriber.email,
    }
}
