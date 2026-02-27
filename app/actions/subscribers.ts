"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ─── SOFT-DELETE SUBSCRIBER ────────────────────────────────
// Sets status to "deleted" instead of physically removing the row.
export async function softDeleteSubscriber(id: string): Promise<{ error: string | null }> {
    const supabase = await createClient()

    const { error } = await supabase
        .from("subscribers")
        .update({ status: "deleted" })
        .eq("id", id)

    if (error) return { error: error.message }

    revalidatePath("/audience")
    return { error: null }
}

// ─── BULK SOFT-DELETE SUBSCRIBERS ──────────────────────────
export async function bulkSoftDeleteSubscribers(ids: string[]): Promise<{ error: string | null }> {
    if (ids.length === 0) return { error: null }

    const supabase = await createClient()

    const { error } = await supabase
        .from("subscribers")
        .update({ status: "deleted" })
        .in("id", ids)

    if (error) return { error: error.message }

    revalidatePath("/audience")
    return { error: null }
}
