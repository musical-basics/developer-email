"use server"

import { createClient } from "@/lib/supabase/server"

export async function getSubscriberHistory(subscriberId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('subscriber_events')
        .select(`
            *,
            campaigns ( name )
        `)
        .eq('subscriber_id', subscriberId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching history:", error)
        return []
    }

    return data
}

export async function getSubscriberCampaigns(subscriberId: string) {
    const supabase = await createClient()

    // Get campaigns sent to this subscriber from sent_history
    const { data, error } = await supabase
        .from('sent_history')
        .select(`
            campaign_id,
            sent_at,
            campaigns ( id, name, status )
        `)
        .eq('subscriber_id', subscriberId)
        .order('sent_at', { ascending: false })

    if (error) {
        console.error("Error fetching subscriber campaigns:", error)
        return []
    }

    // Deduplicate by campaign_id, keep the most recent send
    const seen = new Set<string>()
    const unique = []
    for (const row of data || []) {
        if (row.campaign_id && !seen.has(row.campaign_id)) {
            seen.add(row.campaign_id)
            unique.push({ ...row, created_at: row.sent_at })
        }
    }
    return unique
}

export async function getSubscriberChains(subscriberId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('chain_processes')
        .select(`
            id,
            status,
            current_step_index,
            created_at,
            updated_at,
            email_chains ( id, name, slug )
        `)
        .eq('subscriber_id', subscriberId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching subscriber chains:", error)
        return []
    }

    return data || []
}
