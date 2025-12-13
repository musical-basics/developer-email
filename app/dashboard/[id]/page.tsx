"use client"

import { useState } from "react"
import { TournamentDashboard } from "@/components/dashboard/tournament-dashboard"
import { NewRoundModal } from "@/components/campaigns/new-round-modal"

interface DashboardPageProps {
    params: Promise<{ id: string }>
}

export default function DashboardPage({ params }: DashboardPageProps) {
    const [isWizardOpen, setIsWizardOpen] = useState(false)

    const handleLaunch = (batchSize: number, champion: string, challenger: string) => {
        console.log(`Launching round with ${batchSize} subscribers`)
        console.log(`Champion: ${champion}, Challenger: ${challenger}`)
        setIsWizardOpen(false)
    }

    return (
        <>
            <TournamentDashboard onLaunchNextRound={() => setIsWizardOpen(true)} />
            <NewRoundModal
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onLaunch={handleLaunch}
            />
        </>
    )
}
