"use client"

import { useState } from "react"
import { CampaignsTable } from "@/components/campaigns-table"
import { Campaign } from "@/lib/types"

interface CampaignsTabsProps {
    campaigns: Campaign[]
}

export function CampaignsTabs({ campaigns }: CampaignsTabsProps) {
    const [activeTab, setActiveTab] = useState<"drafts" | "completed">("drafts")

    const drafts = campaigns.filter(c => c.status === "draft")
    const completed = campaigns.filter(c => ["sent", "completed", "active"].includes(c.status))

    return (
        <div className="space-y-4">
            {/* Tab Bar */}
            <div className="flex gap-1 border-b border-border">
                <button
                    onClick={() => setActiveTab("drafts")}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${activeTab === "drafts"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Drafts
                    {drafts.length > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">({drafts.length})</span>
                    )}
                    {activeTab === "drafts" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37]" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("completed")}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${activeTab === "completed"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Completed
                    {completed.length > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">({completed.length})</span>
                    )}
                    {activeTab === "completed" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37]" />
                    )}
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === "drafts" ? (
                <CampaignsTable
                    title="Drafts"
                    campaigns={drafts}
                    loading={false}
                    showAnalytics={false}
                />
            ) : (
                <CampaignsTable
                    title="Completed"
                    campaigns={completed}
                    loading={false}
                />
            )}
        </div>
    )
}
