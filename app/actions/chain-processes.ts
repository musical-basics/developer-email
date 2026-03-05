"use server"

import { createClient } from "@/lib/supabase/server"
import { inngest } from "@/inngest/client"
import { revalidatePath } from "next/cache"
import type { ChainProcess } from "@/lib/types"
import { duplicateChain } from "@/app/actions/chains"

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

    // Snapshot the master chain — clone it so edits to the master don't affect this run
    // Keep subscriber_id null so the snapshot doesn't appear in the Drafts tab
    const { data: clonedChain, error: cloneError } = await duplicateChain(chainId, {
        subscriber_id: null,
        is_snapshot: true,
    })

    if (cloneError || !clonedChain) {
        return { success: false, error: cloneError || "Failed to snapshot chain" }
    }

    const snapshotChainId = clonedChain.id

    // ─── SMART SKIP: Trim already-sent leading steps ───
    // Get snapshot's steps
    const { data: snapshotSteps } = await supabase
        .from("chain_steps")
        .select("id, position, template_key, label")
        .eq("chain_id", snapshotChainId)
        .order("position", { ascending: true })

    const steps = snapshotSteps || []

    // Check which campaigns this subscriber has already received
    const campaignIds = [...new Set(steps.map(s => s.template_key).filter(Boolean))]
    let alreadySentSet = new Set<string>()

    if (campaignIds.length > 0) {
        const { data: sentRows } = await supabase
            .from("sent_history")
            .select("campaign_id")
            .eq("subscriber_id", subscriberId)
            .in("campaign_id", campaignIds)

        if (sentRows) {
            alreadySentSet = new Set(sentRows.map(r => r.campaign_id))
        }
    }

    // Walk from the beginning — skip consecutive already-sent steps
    const skippedStepIds: string[] = []
    const skippedLabels: string[] = []
    let skipCount = 0

    for (const step of steps) {
        if (alreadySentSet.has(step.template_key)) {
            skippedStepIds.push(step.id)
            skippedLabels.push(step.label)
            skipCount++
        } else {
            break // Stop at the first unsent step
        }
    }

    // If ALL steps already sent, skip the chain entirely
    if (skipCount === steps.length) {
        // Clean up the snapshot since we won't use it
        await supabase.from("email_chains").delete().eq("id", snapshotChainId)
        return {
            success: false,
            error: `All ${steps.length} steps in this chain have already been sent to this subscriber.`,
        }
    }

    // Delete skipped steps from the snapshot and re-number
    if (skippedStepIds.length > 0) {
        await supabase.from("chain_steps").delete().in("id", skippedStepIds)

        // Re-number remaining steps starting from position 1
        const remainingSteps = steps.filter(s => !skippedStepIds.includes(s.id))
        for (let i = 0; i < remainingSteps.length; i++) {
            await supabase
                .from("chain_steps")
                .update({ position: i + 1 })
                .eq("id", remainingSteps[i].id)
        }
    }

    // Build history entries
    const historyEntries: any[] = []
    if (skippedLabels.length > 0) {
        historyEntries.push({
            step_name: "System",
            action: `Skipped ${skippedLabels.length} already-sent step(s)`,
            timestamp: new Date().toISOString(),
            details: `Skipped: ${skippedLabels.join(", ")}`,
        })
    }
    historyEntries.push({
        step_name: "System",
        action: "Chain Started",
        timestamp: new Date().toISOString(),
    })

    // Create process row pointing to the snapshot
    const { data: process, error: procError } = await supabase
        .from("chain_processes")
        .insert({
            chain_id: snapshotChainId,
            subscriber_id: subscriberId,
            status: "active",
            current_step_index: 0,
            history: historyEntries,
        })
        .select("id")
        .single()

    if (procError || !process) {
        console.error("Error creating chain process:", procError)
        return { success: false, error: procError?.message || "Failed to create process" }
    }

    // Fire Inngest event with the snapshot chain ID
    await inngest.send({
        name: "chain.run",
        data: {
            processId: process.id,
            chainId: snapshotChainId,
            subscriberId,
            email: subscriber.email,
            firstName: subscriber.first_name || "",
        },
    })

    revalidatePath("/journeys")
    return { success: true, processId: process.id, skippedCount: skipCount }
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

    revalidatePath("/journeys")
    return { success: true }
}
