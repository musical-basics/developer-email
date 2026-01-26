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
    const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, status, created_at, updated_at")
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching campaigns:", error)
        return []
    }

    return data || []
}

export async function getCampaignList() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, status, created_at")
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
                name: `Copy of ${original.name}`,
                status: "draft",
                subject_line: original.subject_line,
                html_content: original.html_content,
                variable_values: original.variable_values,
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
                name: `Copy of ${original.name} (for ${subscriberEmail})`,
                status: "draft",
                subject_line: original.subject_line,
                html_content: original.html_content,
                variable_values: {
                    ...original.variable_values,
                    subscriber_id: subscriberId
                },
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
