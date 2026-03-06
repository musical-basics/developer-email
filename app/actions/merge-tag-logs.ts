"use server"

import { createClient } from "@/lib/supabase/server"

export interface MergeTagLogData {
    subscriber_id: string
    subscriber_email: string
    sent_at: string
    merge_tag_log: {
        tags_found: string[]
        tags_resolved: Record<string, string>
        tags_unresolved: string[]
        entries: {
            tag: string
            category: string
            resolved: boolean
            value: string
            source: string
        }[]
    } | null
}

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
