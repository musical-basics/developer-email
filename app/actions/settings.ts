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

export interface DefaultLinks {
    unsubscribe_url: string
    privacy_url: string
    contact_url: string
    about_url: string
    shipping_url: string
    main_cta_url: string
    crowdfunding_cta_url: string
    homepage_url: string
}

const DEFAULT_LINKS_EMPTY: DefaultLinks = {
    unsubscribe_url: "",
    privacy_url: "",
    contact_url: "",
    about_url: "",
    shipping_url: "",
    main_cta_url: "",
    crowdfunding_cta_url: "",
    homepage_url: "",
}

export async function getDefaultLinks(): Promise<DefaultLinks> {
    const supabase = await createClient()

    const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "default_links")
        .single()

    if (!data?.value) return DEFAULT_LINKS_EMPTY

    try {
        return JSON.parse(data.value)
    } catch {
        return DEFAULT_LINKS_EMPTY
    }
}

export async function saveDefaultLinks(links: DefaultLinks) {
    const supabase = await createClient()

    const { error } = await supabase
        .from("app_settings")
        .upsert({
            key: "default_links",
            value: JSON.stringify(links),
            updated_at: new Date().toISOString()
        })

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath("/settings")
    return { success: true }
}
