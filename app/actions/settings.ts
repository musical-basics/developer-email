"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getCompanyContext() {
    const supabase = await createClient()

    const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "company_context")
        .single()

    return data?.value || ""
}

export async function saveCompanyContext(newContext: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from("app_settings")
        .upsert({
            key: "company_context",
            value: newContext,
            updated_at: new Date().toISOString()
        })

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath("/settings")
    return { success: true }
}
