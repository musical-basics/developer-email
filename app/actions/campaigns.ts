"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createCampaign(prevState: any, formData: FormData) {
    const supabase = await createClient()
    const name = formData.get("name") as string

    if (!name || name.trim() === "") {
        return { error: "Campaign name is required" }
    }

    const { data, error } = await supabase
        .from("campaigns")
        .insert([
            {
                name: name.trim(),
                status: "draft",
                subject_line: "",
            },
        ])
        .select()
        .single()

    if (error) {
        console.error("Error creating campaign:", error)
        return { error: error.message }
    }

    revalidatePath("/campaigns")
    return { data }
}

export async function getCampaigns() {
    const supabase = await createClient()

    // Fetch campaigns
    const { data: campaigns, error } = await supabase
        .from("campaigns")
        .select("id, name, status, created_at, updated_at, total_recipients, total_opens, total_clicks, average_read_time, resend_email_id, is_template, variable_values")
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching campaigns:", error)
        return []
    }

    if (!campaigns || campaigns.length === 0) return []

    // Get unique open counts per campaign from subscriber_events
    const completedIds = campaigns.filter(c => c.status === "completed").map(c => c.id)

    if (completedIds.length === 0) return campaigns

    // Fetch all open events for completed campaigns
    const { data: openEvents } = await supabase
        .from("subscriber_events")
        .select("campaign_id, subscriber_id")
        .eq("type", "open")
        .in("campaign_id", completedIds)

    // Fetch all click events for completed campaigns
    const { data: clickEvents } = await supabase
        .from("subscriber_events")
        .select("campaign_id, subscriber_id")
        .eq("type", "click")
        .in("campaign_id", completedIds)

    // Fetch Conversion Events (hitting the customize/checkout page)
    const { data: conversionEvents } = await supabase
        .from("subscriber_events")
        .select("campaign_id, subscriber_id")
        .eq("type", "page_view")
        .ilike("url", "%/customize%")
        .in("campaign_id", completedIds)

    // Count unique subscribers per campaign
    const uniqueOpens: Record<string, Set<string>> = {}
    const uniqueClicks: Record<string, Set<string>> = {}
    const uniqueConversions: Record<string, Set<string>> = {}

    openEvents?.forEach(e => {
        if (!uniqueOpens[e.campaign_id]) uniqueOpens[e.campaign_id] = new Set()
        uniqueOpens[e.campaign_id].add(e.subscriber_id)
    })

    clickEvents?.forEach(e => {
        if (!uniqueClicks[e.campaign_id]) uniqueClicks[e.campaign_id] = new Set()
        uniqueClicks[e.campaign_id].add(e.subscriber_id)
    })

    conversionEvents?.forEach(e => {
        if (e.campaign_id) {
            if (!uniqueConversions[e.campaign_id]) uniqueConversions[e.campaign_id] = new Set()
            uniqueConversions[e.campaign_id].add(e.subscriber_id)
        }
    })

    // Override the stored counters with computed unique counts
    return campaigns.map(c => ({
        ...c,
        total_opens: uniqueOpens[c.id]?.size ?? c.total_opens ?? 0,
        total_clicks: uniqueClicks[c.id]?.size ?? c.total_clicks ?? 0,
        total_conversions: uniqueConversions[c.id]?.size ?? 0,
    }))
}


export async function getCampaignList() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, status, created_at, is_template")
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching campaign list:", error)
        return []
    }

    return data || []
}

export async function duplicateCampaign(campaignId: string) {
    const supabase = await createClient()

    // 1. Fetch original campaign
    const { data: original, error: fetchError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single()

    if (fetchError || !original) {
        console.error("Error fetching campaign to duplicate:", fetchError)
        return { error: "Failed to fetch original campaign" }
    }

    // 2. Create new campaign with copied data
    const { data, error: insertError } = await supabase
        .from("campaigns")
        .insert([
            {
                name: original.name,
                status: "draft",
                subject_line: original.subject_line,
                html_content: original.html_content,
                variable_values: original.variable_values,
                parent_template_id: original.is_template ? original.id : (original.parent_template_id || null),
            },
        ])
        .select()
        .single()

    if (insertError) {
        console.error("Error duplicating campaign:", insertError)
        return { error: insertError.message }
    }

    revalidatePath("/campaigns")
    return { data }
}

export async function createCampaignForTag(tagName: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("campaigns")
        .insert([
            {
                name: `Campaign for ${tagName}`,
                status: "draft",
                subject_line: `(Draft) Update for ${tagName}`,
                html_content: "",
            },
        ])
        .select()
        .single()

    if (error) {
        console.error("Error creating campaign for tag:", error)
        return { error: error.message }
    }

    revalidatePath("/campaigns")
    return { data }
}

export async function createCampaignForSubscriber(subscriberId: string, email: string, name: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("campaigns")
        .insert([
            {
                name: `Campaign for ${name || email}`,
                status: "draft",
                subject_line: `(Draft) Message for ${name || email}`,
                html_content: "",
                variable_values: {
                    subscriber_id: subscriberId // Store this to lock targeting later if needed
                }
            },
        ])
        .select()
        .single()

    if (error) {
        console.error("Error creating campaign for subscriber:", error)
        return { error: error.message }
    }

    revalidatePath("/campaigns")
    return { data }
}

export async function duplicateCampaignForSubscriber(campaignId: string, subscriberId: string, subscriberEmail: string) {
    const supabase = await createClient()

    // 1. Fetch original campaign
    const { data: original, error: fetchError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single()

    if (fetchError || !original) {
        console.error("Error fetching campaign to duplicate:", fetchError)
        return { error: "Failed to fetch original campaign" }
    }

    // 2. Create new campaign copy with subscriber lock
    const { data, error: insertError } = await supabase
        .from("campaigns")
        .insert([
            {
                // Clean up the name to avoid stacking "Copy of Copy of... (for ...)"
                name: `${original.name.replace(/^(Copy of\s+)+/, "").replace(/\s+\(for\s+.*\)$/, "")} (for ${subscriberEmail})`,
                status: "draft",
                subject_line: original.subject_line,
                html_content: original.html_content,
                variable_values: {
                    ...original.variable_values,
                    subscriber_id: subscriberId
                },
                parent_template_id: original.is_template ? original.id : (original.parent_template_id || null),
            },
        ])
        .select()
        .single()

    if (insertError) {
        console.error("Error duplicating campaign for subscriber:", insertError)
        return { error: insertError.message }
    }

    revalidatePath("/campaigns")
    return { data }
}

export async function deleteCampaign(campaignId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId)

    if (error) {
        console.error("Error deleting campaign:", error)
        return { error: error.message }
    }

    revalidatePath("/campaigns")
    return { success: true }
}

export async function toggleTemplateStatus(campaignId: string, isTemplate: boolean) {
    const supabase = await createClient()
    const { error } = await supabase
        .from("campaigns")
        .update({ is_template: isTemplate })
        .eq("id", campaignId)

    if (error) {
        console.error("Error toggling template status:", error)
        return { success: false, error: error.message }
    }

    revalidatePath("/campaigns")
    return { success: true }
}

// ─── Version History ────────────────────────────────────────────────

export async function saveCampaignBackup(
    campaignId: string,
    htmlContent: string,
    variableValues: Record<string, any>,
    subjectLine: string
) {
    const supabase = await createClient()

    // Insert new backup
    const { error: insertError } = await supabase
        .from("campaign_backups")
        .insert({
            campaign_id: campaignId,
            html_content: htmlContent,
            variable_values: variableValues,
            subject_line: subjectLine,
        })

    if (insertError) {
        console.error("Error saving backup:", insertError)
        return { error: insertError.message }
    }

    // Keep only the newest 5 backups — delete the rest
    const { data: backups } = await supabase
        .from("campaign_backups")
        .select("id")
        .eq("campaign_id", campaignId)
        .order("saved_at", { ascending: false })

    if (backups && backups.length > 5) {
        const idsToDelete = backups.slice(5).map((b) => b.id)
        await supabase
            .from("campaign_backups")
            .delete()
            .in("id", idsToDelete)
    }

    return { success: true }
}

export async function getCampaignBackups(campaignId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("campaign_backups")
        .select("id, saved_at, subject_line")
        .eq("campaign_id", campaignId)
        .order("saved_at", { ascending: false })
        .limit(5)

    if (error) {
        console.error("Error fetching backups:", error)
        return []
    }

    return data || []
}

export async function restoreCampaignBackup(campaignId: string, backupId: string) {
    const supabase = await createClient()

    // Fetch backup
    const { data: backup, error: fetchError } = await supabase
        .from("campaign_backups")
        .select("html_content, variable_values, subject_line")
        .eq("id", backupId)
        .single()

    if (fetchError || !backup) {
        console.error("Error fetching backup:", fetchError)
        return { error: "Backup not found" }
    }

    // Restore into campaign
    const { error: updateError } = await supabase
        .from("campaigns")
        .update({
            html_content: backup.html_content,
            variable_values: backup.variable_values,
            subject_line: backup.subject_line,
        })
        .eq("id", campaignId)

    if (updateError) {
        console.error("Error restoring backup:", updateError)
        return { error: updateError.message }
    }

    return {
        success: true,
        data: {
            html_content: backup.html_content,
            variable_values: backup.variable_values,
            subject_line: backup.subject_line,
        }
    }
}
