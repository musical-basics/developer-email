"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface EmailTrigger {
    id: string
    name: string
    trigger_type: string
    trigger_value: string
    action_type: string
    campaign_id: string | null
    generate_discount: boolean
    discount_config: {
        type: "percentage" | "fixed_amount"
        value: number
        durationDays: number
        codePrefix: string
        usageLimit: number
    } | null
    is_active: boolean
    created_at: string
    // Joined
    campaign_name?: string
}

export async function getTriggers(): Promise<EmailTrigger[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("email_triggers")
        .select("*, campaigns(name)")
        .order("created_at", { ascending: true })

    if (error) {
        console.error("Error fetching triggers:", error)
        return []
    }

    return (data || []).map((t: any) => ({
        ...t,
        campaign_name: t.campaigns?.name || null,
    }))
}

export async function createTrigger(trigger: Omit<EmailTrigger, "id" | "created_at" | "campaign_name">) {
    const supabase = await createClient()
    const { error } = await supabase
        .from("email_triggers")
        .insert({
            name: trigger.name,
            trigger_type: trigger.trigger_type,
            trigger_value: trigger.trigger_value,
            action_type: trigger.action_type,
            campaign_id: trigger.campaign_id,
            generate_discount: trigger.generate_discount,
            discount_config: trigger.discount_config,
            is_active: trigger.is_active,
        })

    if (error) throw new Error(error.message)
    revalidatePath("/triggers")
    return { success: true }
}

export async function updateTrigger(id: string, updates: Partial<Omit<EmailTrigger, "id" | "created_at" | "campaign_name">>) {
    const supabase = await createClient()
    const { error } = await supabase
        .from("email_triggers")
        .update(updates)
        .eq("id", id)

    if (error) throw new Error(error.message)
    revalidatePath("/triggers")
    return { success: true }
}

export async function deleteTrigger(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from("email_triggers")
        .delete()
        .eq("id", id)

    if (error) throw new Error(error.message)
    revalidatePath("/triggers")
    return { success: true }
}
