"use server"

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
)

export interface TagDefinition {
    id: string
    name: string
    color: string
    created_at: string
    updated_at: string
    subscriber_count?: number
}

export async function getTags(): Promise<{ tags: TagDefinition[]; error?: string }> {
    const { data, error } = await supabase
        .from("tag_definitions")
        .select("*")
        .order("name", { ascending: true })

    if (error) return { tags: [], error: error.message }

    // Count subscribers per tag
    const { data: subscribers } = await supabase
        .from("subscribers")
        .select("tags")
        .not("tags", "is", null)

    const tagCounts: Record<string, number> = {}
    for (const sub of subscribers || []) {
        for (const tag of sub.tags || []) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1
        }
    }

    const tagsWithCounts = (data || []).map((t: any) => ({
        ...t,
        subscriber_count: tagCounts[t.name] || 0,
    }))

    return { tags: tagsWithCounts }
}

export async function createTag(name: string, color: string): Promise<{ tag?: TagDefinition; error?: string }> {
    const trimmed = name.trim()
    if (!trimmed) return { error: "Tag name is required" }

    const { data, error } = await supabase
        .from("tag_definitions")
        .insert({ name: trimmed, color })
        .select()
        .single()

    if (error) return { error: error.message }
    return { tag: data }
}

export async function updateTag(id: string, updates: { name?: string; color?: string }): Promise<{ success: boolean; error?: string }> {
    // If renaming, also update all subscriber tags arrays
    if (updates.name) {
        const { data: existing } = await supabase
            .from("tag_definitions")
            .select("name")
            .eq("id", id)
            .single()

        if (existing && existing.name !== updates.name) {
            const oldName = existing.name
            const newName = updates.name.trim()

            // Find all subscribers with the old tag
            const { data: subs } = await supabase
                .from("subscribers")
                .select("id, tags")
                .contains("tags", [oldName])

            // Update each subscriber's tags array
            for (const sub of subs || []) {
                const newTags = (sub.tags || []).map((t: string) => t === oldName ? newName : t)
                await supabase
                    .from("subscribers")
                    .update({ tags: newTags })
                    .eq("id", sub.id)
            }

            updates.name = newName
        }
    }

    const { error } = await supabase
        .from("tag_definitions")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function deleteTag(id: string): Promise<{ success: boolean; error?: string }> {
    // Get the tag name first
    const { data: tag } = await supabase
        .from("tag_definitions")
        .select("name")
        .eq("id", id)
        .single()

    if (!tag) return { success: false, error: "Tag not found" }

    // Remove the tag from all subscribers
    const { data: subs } = await supabase
        .from("subscribers")
        .select("id, tags")
        .contains("tags", [tag.name])

    for (const sub of subs || []) {
        const newTags = (sub.tags || []).filter((t: string) => t !== tag.name)
        await supabase
            .from("subscribers")
            .update({ tags: newTags })
            .eq("id", sub.id)
    }

    // Delete the definition
    const { error } = await supabase
        .from("tag_definitions")
        .delete()
        .eq("id", id)

    if (error) return { success: false, error: error.message }
    return { success: true }
}
