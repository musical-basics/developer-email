"use server"

import { createClient } from "@/lib/supabase/server"
import { inngest } from "@/inngest/client"
import { revalidatePath } from "next/cache"
import type { ChainProcess } from "@/lib/types"

// ─── START A CHAIN PROCESS ─────────────────────────────────
export async function startChainProcess(subscriberId: string, chainId: string) {
    const supabase = await createClient()

    // Fetch subscriber details
    const { data: subscriber, error: subError } = await supabase
        .from("subscribers")
        .select("email, first_name")
        .eq("id", subscriberId)
        .single()

    if (subError || !subscriber) {
        return { success: false, error: "Subscriber not found" }
    }

    // Create process row
    const { data: process, error: procError } = await supabase
        .from("chain_processes")
        .insert({
            chain_id: chainId,
            subscriber_id: subscriberId,
            status: "active",
            current_step_index: 0,
            history: [{ step_name: "System", action: "Chain Started", timestamp: new Date().toISOString() }],
        })
        .select("id")
        .single()

    if (procError || !process) {
        console.error("Error creating chain process:", procError)
        return { success: false, error: procError?.message || "Failed to create process" }
    }

    // Fire Inngest event
    await inngest.send({
        name: "chain.run",
        data: {
            processId: process.id,
            chainId,
            subscriberId,
            email: subscriber.email,
            firstName: subscriber.first_name || "",
        },
    })

    revalidatePath("/chains")
    return { success: true, processId: process.id }
}

// ─── GET ALL CHAIN PROCESSES ───────────────────────────────
export async function getChainProcesses(): Promise<{ data: ChainProcess[]; error: string | null }> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("chain_processes")
        .select(`
            *,
            email_chains ( name, chain_steps ( * ), chain_branches ( * ) ),
            subscribers ( email, first_name )
        `)
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching chain processes:", error)
        return { data: [], error: error.message }
    }

    const processes: ChainProcess[] = (data || []).map((row: any) => ({
        id: row.id,
        chain_id: row.chain_id,
        subscriber_id: row.subscriber_id,
        status: row.status,
        current_step_index: row.current_step_index,
        next_step_at: row.next_step_at,
        history: row.history || [],
        created_at: row.created_at,
        updated_at: row.updated_at,
        chain_name: row.email_chains?.name || "Unknown Chain",
        chain_steps: (row.email_chains?.chain_steps || []).sort((a: any, b: any) => a.position - b.position),
        chain_branches: (row.email_chains?.chain_branches || []).sort((a: any, b: any) => a.position - b.position),
        subscriber_email: row.subscribers?.email || "Unknown",
        subscriber_first_name: row.subscribers?.first_name || "",
    }))

    return { data: processes, error: null }
}

// ─── UPDATE PROCESS STATUS ─────────────────────────────────
export async function updateProcessStatus(processId: string, newStatus: "active" | "paused" | "cancelled") {
    const supabase = await createClient()

    // Fetch current process to append to history
    const { data: current } = await supabase
        .from("chain_processes")
        .select("history")
        .eq("id", processId)
        .single()

    const history = current?.history || []
    const actionMap = { active: "Chain Resumed", paused: "Chain Paused", cancelled: "Chain Cancelled" }
    history.push({
        step_name: "System",
        action: actionMap[newStatus],
        timestamp: new Date().toISOString(),
    })

    const { error } = await supabase
        .from("chain_processes")
        .update({
            status: newStatus,
            history,
            updated_at: new Date().toISOString(),
        })
        .eq("id", processId)

    if (error) {
        console.error("Error updating process status:", error)
        return { success: false, error: error.message }
    }

    // Fire Inngest events for cancel/resume
    if (newStatus === "cancelled") {
        await inngest.send({ name: "chain.cancel", data: { processId } })
    } else if (newStatus === "active") {
        // "active" means resume
        await inngest.send({ name: "chain.resume", data: { processId } })
    }

    revalidatePath("/chains")
    return { success: true }
}
