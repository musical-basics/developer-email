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
        .select("*")
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching campaigns:", error)
        return []
    }

    return data || []
}
