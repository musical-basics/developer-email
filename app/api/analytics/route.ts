import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
)

const EVENT_TYPES = ['open', 'click', 'unsubscribe', 'bounce', 'complaint', 'conversion_t1', 'conversion_t2', 'conversion_t3'] as const
type EventType = typeof EVENT_TYPES[number]

interface PerformanceRow {
    name: string
    sends: number
    opens: number
    clicks: number
    unsubs: number
    bounces: number
    complaints: number
    t1: number
    t2: number
    t3: number
    open_rate: number
    click_rate: number
    unsub_rate: number
    bounce_rate: number
    complaint_rate: number
    t1_rate: number
    t2_rate: number
    t3_rate: number
}

function calcRate(count: number, total: number): number {
    return total > 0 ? Math.round((count / total) * 1000) / 10 : 0
}

export async function GET() {
    try {
        // ─── FETCH ALL RAW DATA ────────────────────────

        // All campaigns
        const { data: allCampaigns } = await supabase
            .from('campaigns')
            .select('id, name, is_template, parent_template_id, total_recipients, variable_values')

        // All subscriber events
        const { data: allEvents } = await supabase
            .from('subscriber_events')
            .select('subscriber_id, campaign_id, type, created_at')

        // All chain processes
        const { data: allProcesses } = await supabase
            .from('chain_processes')
            .select('id, chain_id, subscriber_id, status, created_at, updated_at')
            .order('created_at', { ascending: true })

        // All chains
        const { data: allChains } = await supabase
            .from('email_chains')
            .select('id, name')

        const campaigns = allCampaigns || []
        const events = allEvents || []
        const processes = allProcesses || []
        const chains = allChains || []

        // ─── A. MASTER TEMPLATES ───────────────────────

        const templates = campaigns.filter(c => c.is_template === true)
        const templatePerformance: PerformanceRow[] = []

        for (const template of templates) {
            // Find all children (campaigns cloned from this template)
            const children = campaigns.filter(c => c.parent_template_id === template.id)
            const familyIds = new Set([template.id, ...children.map(c => c.id)])

            // Total sends across template + all children
            const sends = (template.total_recipients || 0) +
                children.reduce((sum, c) => sum + (c.total_recipients || 0), 0)

            // Count unique subscribers per event type across the family
            const eventCounts: Record<EventType, Set<string>> = {
                open: new Set(),
                click: new Set(),
                unsubscribe: new Set(),
                bounce: new Set(),
                complaint: new Set(),
                conversion_t1: new Set(),
                conversion_t2: new Set(),
                conversion_t3: new Set(),
            }

            for (const event of events) {
                if (event.campaign_id && familyIds.has(event.campaign_id)) {
                    const type = event.type as EventType
                    if (eventCounts[type]) {
                        eventCounts[type].add(event.subscriber_id)
                    }
                }
            }

            templatePerformance.push({
                name: template.name,
                sends,
                opens: eventCounts.open.size,
                clicks: eventCounts.click.size,
                unsubs: eventCounts.unsubscribe.size,
                bounces: eventCounts.bounce.size,
                complaints: eventCounts.complaint.size,
                t1: eventCounts.conversion_t1.size,
                t2: eventCounts.conversion_t2.size,
                t3: eventCounts.conversion_t3.size,
                open_rate: calcRate(eventCounts.open.size, sends),
                click_rate: calcRate(eventCounts.click.size, sends),
                unsub_rate: calcRate(eventCounts.unsubscribe.size, sends),
                bounce_rate: calcRate(eventCounts.bounce.size, sends),
                complaint_rate: calcRate(eventCounts.complaint.size, sends),
                t1_rate: calcRate(eventCounts.conversion_t1.size, sends),
                t2_rate: calcRate(eventCounts.conversion_t2.size, sends),
                t3_rate: calcRate(eventCounts.conversion_t3.size, sends),
            })
        }

        // Sort: T3 desc → T2 → T1
        templatePerformance.sort((a, b) => b.t3 - a.t3 || b.t2 - a.t2 || b.t1 - a.t1)

        // ─── B. CHAINS (SLIDING WINDOW ATTRIBUTION) ────

        // Group processes by subscriber for quick lookup
        const processesBySub: Record<string, typeof processes> = {}
        for (const proc of processes) {
            if (!processesBySub[proc.subscriber_id]) processesBySub[proc.subscriber_id] = []
            processesBySub[proc.subscriber_id].push(proc)
        }

        // Build chain performance map
        const chainMap: Record<string, {
            name: string
            enrolled: number
            events: Record<EventType, Set<string>>
        }> = {}

        for (const chain of chains) {
            const enrolled = processes.filter(p => p.chain_id === chain.id).length
            chainMap[chain.id] = {
                name: chain.name,
                enrolled,
                events: {
                    open: new Set(),
                    click: new Set(),
                    unsubscribe: new Set(),
                    bounce: new Set(),
                    complaint: new Set(),
                    conversion_t1: new Set(),
                    conversion_t2: new Set(),
                    conversion_t3: new Set(),
                },
            }
        }

        // Attribution: For each event, find the most recent matching process
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

        for (const event of events) {
            const subProcesses = processesBySub[event.subscriber_id]
            if (!subProcesses || subProcesses.length === 0) continue

            const eventTime = new Date(event.created_at).getTime()

            // Find the most recent process that started before this event
            let matchedProcess = null
            for (let i = subProcesses.length - 1; i >= 0; i--) {
                const proc = subProcesses[i]
                const procStart = new Date(proc.created_at).getTime()
                if (procStart <= eventTime) {
                    matchedProcess = proc
                    break
                }
            }

            if (!matchedProcess) continue

            // Window check: if completed/cancelled, event must be within 7 days of updated_at
            if (matchedProcess.status === 'completed' || matchedProcess.status === 'cancelled') {
                const windowEnd = new Date(matchedProcess.updated_at).getTime() + SEVEN_DAYS_MS
                if (eventTime > windowEnd) continue
            }

            // Credit the event to this chain
            const chainEntry = chainMap[matchedProcess.chain_id]
            if (chainEntry) {
                const type = event.type as EventType
                if (chainEntry.events[type]) {
                    chainEntry.events[type].add(event.subscriber_id)
                }
            }
        }

        // Build final chains array
        const chainPerformance: PerformanceRow[] = Object.entries(chainMap).map(([_, chain]) => ({
            name: chain.name,
            sends: chain.enrolled,
            opens: chain.events.open.size,
            clicks: chain.events.click.size,
            unsubs: chain.events.unsubscribe.size,
            bounces: chain.events.bounce.size,
            complaints: chain.events.complaint.size,
            t1: chain.events.conversion_t1.size,
            t2: chain.events.conversion_t2.size,
            t3: chain.events.conversion_t3.size,
            open_rate: calcRate(chain.events.open.size, chain.enrolled),
            click_rate: calcRate(chain.events.click.size, chain.enrolled),
            unsub_rate: calcRate(chain.events.unsubscribe.size, chain.enrolled),
            bounce_rate: calcRate(chain.events.bounce.size, chain.enrolled),
            complaint_rate: calcRate(chain.events.complaint.size, chain.enrolled),
            t1_rate: calcRate(chain.events.conversion_t1.size, chain.enrolled),
            t2_rate: calcRate(chain.events.conversion_t2.size, chain.enrolled),
            t3_rate: calcRate(chain.events.conversion_t3.size, chain.enrolled),
        }))

        // Sort: T3 desc → T2 → T1
        chainPerformance.sort((a, b) => b.t3 - a.t3 || b.t2 - a.t2 || b.t1 - a.t1)

        // ─── GROUP BY AUDIENCE CONTEXT ──────────────────
        type AudienceBucket = "dreamplay" | "musicalbasics" | "both"
        const audienceBuckets: Record<AudienceBucket, { templates: PerformanceRow[]; chains: PerformanceRow[] }> = {
            dreamplay: { templates: [], chains: [] },
            musicalbasics: { templates: [], chains: [] },
            both: { templates: [], chains: [] },
        }

        // Group templates by audience
        for (const template of templates) {
            const audience = (template as any).variable_values?.audience_context || "dreamplay"
            const row = templatePerformance.find(r => r.name === template.name)
            if (row) {
                const bucket = audienceBuckets[audience as AudienceBucket] || audienceBuckets.dreamplay
                bucket.templates.push(row)
            }
        }

        return NextResponse.json({
            templates: templatePerformance,
            chains: chainPerformance,
            byAudience: audienceBuckets,
        })

    } catch (error) {
        console.error("Analytics Error:", error)
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }
}
