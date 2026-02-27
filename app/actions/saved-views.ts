"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface SavedView {
    id: string
    name: string
    search_query: string
    selected_tags: string[]
    excluded_tags: string[]
    status_filter: string[]
    show_test_only: boolean
    last_emailed_sort: string | null
    created_at?: string
    updated_at?: string
}

export async function getSavedViews(): Promise<SavedView[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("audience_saved_views")
        .select("*")
        .order("created_at", { ascending: true })

    if (error) {
        console.error("Error fetching saved views:", error)
        return []
    }
    return data || []
}

export async function createSavedView(view: {
    name: string
    search_query: string
    selected_tags: string[]
    excluded_tags: string[]
    status_filter: string[]
    show_test_only: boolean
    last_emailed_sort: string | null
}): Promise<SavedView | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("audience_saved_views")
        .insert(view)
        .select()
        .single()

    if (error) {
        console.error("Error creating saved view:", error)
        return null
    }
    revalidatePath("/audience")
    return data
}

export async function deleteSavedView(id: string): Promise<boolean> {
    const supabase = await createClient()
    const { error } = await supabase
        .from("audience_saved_views")
        .delete()
        .eq("id", id)

    if (error) {
        console.error("Error deleting saved view:", error)
        return false
    }
    revalidatePath("/audience")
    return true
}
