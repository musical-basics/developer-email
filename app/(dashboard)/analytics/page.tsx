"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Mail, MousePointer2, DollarSign, ArrowUpRight, ArrowDownRight, Smartphone, Monitor, Loader2 } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Fetch real data on load
        fetch('/api/analytics')
            .then(res => res.json())
            .then(realData => {
                setData(realData)
                setLoading(false)
            })
            .catch(err => {
                console.error("Failed to fetch analytics:", err)
                setLoading(false)
            })
    }, [])

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // Default empty state if data fails
    const kpi = data?.kpi || { revenue: 0, subscribers: 0, openRate: 0, clickRate: 0 }
    const chartData = data?.chart || []
    const recentCampaigns = data?.recent || []

    return (
        <div className="p-8 space-y-8 bg-background min-h-screen text-foreground">

            {/* 1. HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Campaign Intelligence</h1>
                    <p className="text-muted-foreground mt-1">Performance for DreamPlay Pianos (Last 30 Days)</p>
                </div>
                <div className="flex gap-2">
                    <span className="bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-xs font-medium border border-green-900/50 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        All Systems Operational
                    </span>
                </div>
            </div>

            {/* 2. KPI CARDS */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    title="Total Revenue"
                    value={`$${kpi.revenue.toLocaleString()}`}
                    icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
                    trend="+12%" // You could calculate this if you had historical data
                    trendUp={true}
                />
                <KpiCard
                    title="Active Subscribers"
                    value={kpi.subscribers.toLocaleString()}
                    icon={<Users className="h-4 w-4 text-blue-500" />}
                    trend="+2.1%"
                    trendUp={true}
                />
                <KpiCard
                    title="Avg. Open Rate"
                    value={`${kpi.openRate.toFixed(1)}%`}
                    icon={<Mail className="h-4 w-4 text-purple-500" />}
                    trend="-1.4%"
                    trendUp={false}
                    subtext="Industry avg: 38%"
                />
                <KpiCard
                    title="Click-Through Rate"
                    value={`${kpi.clickRate.toFixed(1)}%`}
                    icon={<MousePointer2 className="h-4 w-4 text-orange-500" />}
                    trend="+0.8%"
                    trendUp={true}
                />
            </div>

            {/* 3. VISUALIZATIONS */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

                {/* Main Chart */}
                <Card className="col-span-4 bg-card border-border">
                    <CardHeader>
                        <CardTitle>Engagement Velocity</CardTitle>
                        <CardDescription>Opens vs. Clicks over the last 30 days</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="day" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f1f1f', borderColor: '#333', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Line type="monotone" dataKey="opens" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 8 }} />
                                    <Line type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Side Chart: Device Split (Static for now as mostly client-side tracking) */}
                <Card className="col-span-3 bg-card border-border">
                    <CardHeader>
                        <CardTitle>Device Breakdown</CardTitle>
                        <CardDescription>Where are your pianists reading?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center gap-8 mb-6">
                            <div className="flex flex-col items-center">
                                <div className="bg-primary/10 p-3 rounded-full mb-2">
                                    <Smartphone className="w-6 h-6 text-primary" />
                                </div>
                                <span className="text-2xl font-bold">65%</span>
                                <span className="text-xs text-muted-foreground">Mobile</span>
                            </div>
                            <div className="w-px h-12 bg-border" />
                            <div className="flex flex-col items-center">
                                <div className="bg-muted p-3 rounded-full mb-2">
                                    <Monitor className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <span className="text-2xl font-bold">35%</span>
                                <span className="text-xs text-muted-foreground">Desktop</span>
                            </div>
                        </div>
                        <p className="text-sm text-center text-muted-foreground">
                            Your audience is highly mobile. Ensure your "Buy Now" buttons are large and tap-friendly.
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* 4. RECENT CAMPAIGNS LIST */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle>Recent Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-8">
                        {recentCampaigns.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                No campaigns sent yet. Start your first broadcast!
                            </div>
                        ) : (
                            recentCampaigns.map((campaign: any, i: number) => {
                                const openRate = campaign.total_recipients > 0
                                    ? ((campaign.total_opens || 0) / campaign.total_recipients * 100).toFixed(1)
                                    : "0.0";
                                const clickRate = campaign.total_recipients > 0
                                    ? ((campaign.total_clicks || 0) / campaign.total_recipients * 100).toFixed(1)
                                    : "0.0";

                                return (
                                    <div key={campaign.id || i} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{campaign.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {campaign.sent_at
                                                    ? new Date(campaign.sent_at).toLocaleDateString()
                                                    : "Draft"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className="text-right">
                                                <p className="text-xs text-muted-foreground">Open Rate</p>
                                                <p className="font-bold text-sm">{openRate}%</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-muted-foreground">Click Rate</p>
                                                <p className="font-bold text-sm text-emerald-400">{clickRate}%</p>
                                            </div>
                                            <div className={`text-xs px-2 py-1 rounded border capitalize ${campaign.status === 'sending' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                                    campaign.status === 'completed' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                                        'bg-muted border-border'
                                                }`}>
                                                {campaign.status}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function KpiCard({ title, value, icon, trend, trendUp, subtext }: any) {
    return (
        <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs flex items-center ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
                        {trendUp ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                        {trend}
                    </span>
                    {subtext && <span className="text-xs text-muted-foreground ml-1">{subtext}</span>}
                </div>
            </CardContent>
        </Card>
    )
}
