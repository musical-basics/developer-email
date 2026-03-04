"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Home, Mail, Users, PenTool, BarChart3, Settings, Music, Layers, ImageIcon, Route, MousePointerSquareDashed, Zap, Brain, Tag, TicketPercent, BotMessageSquare, ArrowDownToLine, ScrollText } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface NavGroup {
    label?: string
    items: { name: string; href: string; icon: any }[]
}

const navGroups: NavGroup[] = [
    {
        items: [
            { name: "Home", href: "/", icon: Home },
            { name: "Campaigns", href: "/campaigns", icon: Mail },
            { name: "Automated Emails", href: "/automated-emails", icon: BotMessageSquare },
            { name: "Triggers", href: "/triggers", icon: Zap },
            { name: "Audience", href: "/audience", icon: Users },
            { name: "Email Builder", href: "/editor", icon: PenTool },
        ],
    },
    {
        label: "Tools",
        items: [
            { name: "Assets Library", href: "/assets", icon: ImageIcon },
            { name: "Tags", href: "/tags", icon: Tag },
            { name: "Merge Tags", href: "/merge-tags", icon: Layers },
            { name: "Analytics", href: "/analytics", icon: BarChart3 },
            { name: "Journeys", href: "/journeys", icon: Route },
            { name: "Discounts", href: "/discounts", icon: TicketPercent },
            { name: "Logs", href: "/logs", icon: ScrollText },
            { name: "Mailchimp Import", href: "/migrate", icon: ArrowDownToLine },
        ],
    },
    {
        label: "Additional",
        items: [
            { name: "Modular Builder", href: "/modular-editor", icon: Layers },
            { name: "Drag & Drop", href: "/dnd-editor", icon: MousePointerSquareDashed },
            { name: "Knowledge Builder", href: "/editor-v2", icon: Brain },
        ],
    },
]

export function AppSidebar() {
    const pathname = usePathname()
    const [pendingCount, setPendingCount] = useState(0)

    // Fetch pending AI draft count
    useEffect(() => {
        const supabase = createClient()

        const fetchCount = async () => {
            const { data } = await supabase
                .from("campaigns")
                .select("id", { count: "exact" })
                .eq("status", "draft")
                .not("variable_values->is_jit_draft", "is", null)

            // Filter for is_jit_draft === true client-side
            const jitDrafts = (data || []).filter(
                (c: any) => c.variable_values?.is_jit_draft === true
            )
            setPendingCount(jitDrafts.length)
        }

        fetchCount()
        // Refresh every 60 seconds
        const interval = setInterval(fetchCount, 60000)
        return () => clearInterval(interval)
    }, [])

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card">
            <div className="flex h-full flex-col">
                {/* Brand */}
                <div className="flex h-16 items-center gap-3 border-b border-border px-6">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                        <Music className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="text-lg font-semibold text-foreground">Musical Basics</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-4">
                    {navGroups.map((group, gi) => (
                        <div key={gi} className={gi > 0 ? "mt-4 pt-4 border-t border-border" : ""}>
                            {group.label && (
                                <p className="px-3 mb-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">
                                    {group.label}
                                </p>
                            )}
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                                isActive
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                            )}
                                        >
                                            <item.icon className="h-5 w-5" />
                                            {item.name}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Below separator */}
                    <div className="pt-4 mt-4 border-t border-border space-y-1">
                        <Link
                            href="/approvals"
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                pathname === "/approvals"
                                    ? "bg-violet-500/20 text-violet-300"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                        >
                            <Brain className="h-5 w-5" />
                            AI Approvals
                            {pendingCount > 0 && (
                                <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-violet-500 px-1.5 text-[10px] font-bold text-white">
                                    {pendingCount}
                                </span>
                            )}
                        </Link>
                        <Link
                            href="/settings"
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                pathname === "/settings"
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                        >
                            <Settings className="h-5 w-5" />
                            Settings
                        </Link>
                    </div>
                </nav>

                {/* Footer */}
                <div className="border-t border-border p-4">
                    <p className="text-xs text-muted-foreground">Musical Basics Engine v1.0</p>
                </div>
            </div>
        </aside>
    )
}
