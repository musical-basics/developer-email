"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Home, Mail, Users, PenTool, BarChart3, Settings, Music, Layers, ImageIcon, GitBranch, MousePointerSquareDashed, Zap, Brain, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Campaigns", href: "/campaigns", icon: Mail },
    { name: "Audience", href: "/audience", icon: Users },
    { name: "Email Builder", href: "/editor", icon: PenTool },
    { name: "Mailchimp Import", href: "/migrate", icon: Zap },
    { name: "Modular Builder", href: "/modular-editor", icon: Layers },
    { name: "Drag & Drop", href: "/dnd-editor", icon: MousePointerSquareDashed },
    { name: "Assets Library", href: "/assets", icon: ImageIcon },
    { name: "Tags", href: "/tags", icon: Tag },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Chains", href: "/chains", icon: GitBranch },
    { name: "Settings", href: "/settings", icon: Settings },
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
                <nav className="flex-1 space-y-1 px-3 py-4">
                    {navItems.map((item) => {
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

                    {/* AI Approvals — separate with visual distinction */}
                    <div className="pt-2 mt-2 border-t border-border">
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
