"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

export async function deleteAsset(fileName: string) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { error } = await supabase.storage.from("email-assets").remove([fileName])

    if (error) {
        console.error("Error deleting asset:", error)
        return { success: false, error: error.message }
    }

    return { success: true }
}
