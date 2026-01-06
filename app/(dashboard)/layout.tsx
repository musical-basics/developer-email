import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-background">
            <AppSidebar />
            <main className="pl-64">
                <DashboardHeader />
                {children}
            </main>
        </div>
    )
}
