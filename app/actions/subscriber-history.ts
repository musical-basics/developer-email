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
