import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase with Service Key to bypass RLS for admin stats
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
)

export async function GET() {
    try {
        // 1. Fetch campaigns from database
        const { data: campaigns, error: campaignsError } = await supabase
            .from('campaigns')
            .select('*')
            .order('sent_at', { ascending: false }) // Newest first
            .limit(30) // Last 30 campaigns

        if (campaignsError) throw campaignsError

        // 2. Fetch subscribers count
        const { count: subscribersCount, error: subscribersError } = await supabase
            .from('subscribers')
            .select('*', { count: 'exact', head: true })

        if (subscribersError) throw subscribersError

        // 3. Calculate Totals for the "KPI Cards"
        const totals = campaigns.reduce((acc, camp) => ({
            revenue: acc.revenue + (camp.revenue_attributed || 0),
            sent: acc.sent + (camp.total_recipients || 0),
            opens: acc.opens + (camp.total_opens || 0),
            clicks: acc.clicks + (camp.total_clicks || 0),
        }), { revenue: 0, sent: 0, opens: 0, clicks: 0 })

        // 4. Format Data for the "Line Chart" (Group by Day)
        // This transforms the raw list into { day: 'Mon', opens: 120 } format
        const chartData = campaigns.slice().reverse().map(c => ({
            day: new Date(c.sent_at || c.created_at).toLocaleDateString('en-US', { weekday: 'short' }),
            opens: c.total_opens || 0,
            clicks: c.total_clicks || 0
        }))

        return NextResponse.json({
            kpi: {
                revenue: totals.revenue,
                subscribers: subscribersCount || 0,
                openRate: totals.sent > 0 ? (totals.opens / totals.sent) * 100 : 0,
                clickRate: totals.sent > 0 ? (totals.clicks / totals.sent) * 100 : 0
            },
            chart: chartData,
            recent: campaigns.slice(0, 5) // Top 5 recent (un-reversed)
        })

    } catch (error) {
        console.error("Analytics Error:", error)
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
}
