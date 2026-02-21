"use client"

import { useState } from "react"
import { CampaignsTable } from "@/components/campaigns-table"
import { Campaign } from "@/lib/types"

interface CampaignsTabsProps {
    campaigns: Campaign[]
}

export function CampaignsTabs({ campaigns }: CampaignsTabsProps) {
    const [activeTab, setActiveTab] = useState<"templates" | "drafts" | "completed">("templates")

    const templates = campaigns.filter(c => c.is_template === true)
    const drafts = campaigns.filter(c => c.status === "draft" && !c.is_template && !c.variable_values?.subscriber_id)
    const completed = campaigns.filter(c => ["sent", "completed", "active"].includes(c.status) && !c.is_template)

    const tabs = [
        { key: "templates" as const, label: "Master Templates", count: templates.length },
        { key: "drafts" as const, label: "Drafts", count: drafts.length },
        { key: "completed" as const, label: "Completed", count: completed.length },
    ]

    const tabData = {
        templates: { title: "Master Templates", campaigns: templates, showAnalytics: false },
        drafts: { title: "Drafts", campaigns: drafts, showAnalytics: false },
        completed: { title: "Completed", campaigns: completed, showAnalytics: true },
    }

    const active = tabData[activeTab]

    return (
        <div className="space-y-4">
            {/* Tab Bar */}
            <div className="flex gap-1 border-b border-border">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${activeTab === tab.key
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">({tab.count})</span>
                        )}
                        {activeTab === tab.key && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37]" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <CampaignsTable
                title={active.title}
                campaigns={active.campaigns}
                loading={false}
                showAnalytics={active.showAnalytics}
            />
        </div>
    )
}
