"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ─── Types ─────────────────────────────────────────────────
export interface ChainStepRow {
    id?: string
    chain_id?: string
    position: number
    label: string
    template_key: string
    wait_after: string | null
}

export interface ChainBranchRow {
    id?: string
    chain_id?: string
    description: string
    position: number
    label: string
    condition: string
    action: string
}

export interface ChainRow {
    id: string
    slug: string
    name: string
    description: string | null
    trigger_label: string | null
    trigger_event: string
    created_at: string
    updated_at: string
    chain_steps: ChainStepRow[]
    chain_branches: ChainBranchRow[]
}

export interface ChainFormData {
    name: string
    slug: string
    description: string
    trigger_label: string
    trigger_event: string
    steps: Omit<ChainStepRow, "id" | "chain_id">[]
    branches: Omit<ChainBranchRow, "id" | "chain_id">[]
}

// ─── GET ALL ───────────────────────────────────────────────
export async function getChains(): Promise<{ data: ChainRow[] | null; error: string | null }> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("email_chains")
        .select(`
            *,
            chain_steps ( * ),
            chain_branches ( * )
        `)
        .order("created_at", { ascending: true })

    if (error) return { data: null, error: error.message }

    // Sort steps and branches by position
    const sorted = (data || []).map((chain: any) => ({
        ...chain,
        chain_steps: (chain.chain_steps || []).sort((a: any, b: any) => a.position - b.position),
        chain_branches: (chain.chain_branches || []).sort((a: any, b: any) => a.position - b.position),
    }))

    return { data: sorted, error: null }
}

// ─── CREATE ────────────────────────────────────────────────
export async function createChain(formData: ChainFormData): Promise<{ data: { id: string } | null; error: string | null }> {
    const supabase = await createClient()

    // 1. Insert the chain
    const { data: chain, error: chainError } = await supabase
        .from("email_chains")
        .insert({
            slug: formData.slug,
            name: formData.name,
            description: formData.description || null,
            trigger_label: formData.trigger_label || null,
            trigger_event: formData.trigger_event,
        })
        .select("id")
        .single()

    if (chainError) return { data: null, error: chainError.message }

    // 2. Insert steps
    if (formData.steps.length > 0) {
        const stepsToInsert = formData.steps.map((step, i) => ({
            chain_id: chain.id,
            position: i + 1,
            label: step.label,
            template_key: step.template_key,
            wait_after: step.wait_after || null,
        }))

        const { error: stepsError } = await supabase.from("chain_steps").insert(stepsToInsert)
        if (stepsError) return { data: null, error: stepsError.message }
    }

    // 3. Insert branches
    if (formData.branches.length > 0) {
        const branchesToInsert = formData.branches.map((branch, i) => ({
            chain_id: chain.id,
            description: branch.description,
            position: i + 1,
            label: branch.label,
            condition: branch.condition,
            action: branch.action,
        }))

        const { error: branchError } = await supabase.from("chain_branches").insert(branchesToInsert)
        if (branchError) return { data: null, error: branchError.message }
    }

    revalidatePath("/chains")
    return { data: { id: chain.id }, error: null }
}

// ─── UPDATE ────────────────────────────────────────────────
export async function updateChain(chainId: string, formData: ChainFormData): Promise<{ error: string | null }> {
    const supabase = await createClient()

    // 1. Update chain metadata
    const { error: chainError } = await supabase
        .from("email_chains")
        .update({
            slug: formData.slug,
            name: formData.name,
            description: formData.description || null,
            trigger_label: formData.trigger_label || null,
            trigger_event: formData.trigger_event,
            updated_at: new Date().toISOString(),
        })
        .eq("id", chainId)

    if (chainError) return { error: chainError.message }

    // 2. Replace steps: delete all, re-insert
    await supabase.from("chain_steps").delete().eq("chain_id", chainId)

    if (formData.steps.length > 0) {
        const stepsToInsert = formData.steps.map((step, i) => ({
            chain_id: chainId,
            position: i + 1,
            label: step.label,
            template_key: step.template_key,
            wait_after: step.wait_after || null,
        }))

        const { error: stepsError } = await supabase.from("chain_steps").insert(stepsToInsert)
        if (stepsError) return { error: stepsError.message }
    }

    // 3. Replace branches: delete all, re-insert
    await supabase.from("chain_branches").delete().eq("chain_id", chainId)

    if (formData.branches.length > 0) {
        const branchesToInsert = formData.branches.map((branch, i) => ({
            chain_id: chainId,
            description: branch.description,
            position: i + 1,
            label: branch.label,
            condition: branch.condition,
            action: branch.action,
        }))

        const { error: branchError } = await supabase.from("chain_branches").insert(branchesToInsert)
        if (branchError) return { error: branchError.message }
    }

    revalidatePath("/chains")
    return { error: null }
}

// ─── DELETE ────────────────────────────────────────────────
export async function deleteChain(chainId: string): Promise<{ error: string | null }> {
    const supabase = await createClient()

    const { error } = await supabase
        .from("email_chains")
        .delete()
        .eq("id", chainId)

    if (error) return { error: error.message }

    revalidatePath("/chains")
    return { error: null }
}
