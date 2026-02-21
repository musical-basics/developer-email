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

    // Get unique campaigns this subscriber received (type = 'sent')
    const { data, error } = await supabase
        .from('subscriber_events')
        .select(`
            campaign_id,
            created_at,
            campaigns ( id, name, status )
        `)
        .eq('subscriber_id', subscriberId)
        .eq('type', 'sent')
        .order('created_at', { ascending: false })

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
            unique.push(row)
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
