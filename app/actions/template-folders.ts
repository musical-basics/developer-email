"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface TemplateFolder {
    id: string
    name: string
    sort_order: number
    created_at: string
    updated_at: string
}

export async function getTemplateFolders(): Promise<TemplateFolder[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("template_folders")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })

    if (error) {
        console.error("Error fetching template folders:", error)
        return []
    }

    return data || []
}

export async function createTemplateFolder(name: string) {
    if (!name || name.trim() === "") {
        return { error: "Folder name is required" }
    }

    const supabase = await createClient()

    // Get the next sort_order
    const { data: existing } = await supabase
        .from("template_folders")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)

    const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order || 0) + 1 : 0

    const { data, error } = await supabase
        .from("template_folders")
        .insert({ name: name.trim(), sort_order: nextOrder })
        .select()
        .single()

    if (error) {
        console.error("Error creating template folder:", error)
        return { error: error.message }
    }

    revalidatePath("/campaigns")
    return { data }
}

export async function renameTemplateFolder(id: string, name: string) {
    if (!name || name.trim() === "") {
        return { error: "Folder name is required" }
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from("template_folders")
        .update({ name: name.trim(), updated_at: new Date().toISOString() })
        .eq("id", id)

    if (error) {
        console.error("Error renaming template folder:", error)
        return { error: error.message }
    }

    revalidatePath("/campaigns")
    return { success: true }
}

export async function deleteTemplateFolder(id: string) {
    const supabase = await createClient()

    // ON DELETE SET NULL handles moving templates back to uncategorized
    const { error } = await supabase
        .from("template_folders")
        .delete()
        .eq("id", id)

    if (error) {
        console.error("Error deleting template folder:", error)
        return { error: error.message }
    }

    revalidatePath("/campaigns")
    return { success: true }
}

export async function moveTemplateToFolder(campaignId: string, folderId: string | null) {
    const supabase = await createClient()
    const { error } = await supabase
        .from("campaigns")
        .update({ template_folder_id: folderId })
        .eq("id", campaignId)

    if (error) {
        console.error("Error moving template to folder:", error)
        return { error: error.message }
    }

    revalidatePath("/campaigns")
    return { success: true }
}
