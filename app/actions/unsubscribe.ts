"use server"

import { createClient } from "@/lib/supabase/server"

export async function unsubscribeUser(subscriberId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from("subscribers")
        .update({ status: "unsubscribed" })
        .eq("id", subscriberId)

    if (error) {
        console.error("Unsubscribe error:", error)
        return { success: false, error: error.message }
    }

    return { success: true }
}
