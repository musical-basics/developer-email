import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Campaign } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"

const statusStyles: Record<string, string> = {
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    draft: "bg-muted text-muted-foreground border-border",
}

interface CampaignsTableProps {
    campaigns: Campaign[]
    loading: boolean
}

export function CampaignsTable({ campaigns = [], loading }: CampaignsTableProps) {
    if (loading) {
        return <div className="text-center py-10 text-muted-foreground">Loading campaigns...</div>
    }

    return (
        <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold text-card-foreground">Recent Campaigns</h2>
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Campaign Name</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                        <TableHead className="text-muted-foreground">Created</TableHead>
                        <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {campaigns.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                No campaigns found. Create one to get started.
                            </TableCell>
                        </TableRow>
                    ) : (
                        campaigns.map((campaign) => (
                            <TableRow key={campaign.id} className="border-border">
                                <TableCell className="font-medium text-card-foreground">
                                    {campaign.name || "Untitled Campaign"}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={statusStyles[campaign.status] || statusStyles.draft}>
                                        {campaign.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button
                                        asChild
                                        variant="ghost"
                                        size="sm"
                                        className="text-primary hover:text-primary/80 hover:bg-primary/10"
                                    >
                                        <Link href={`/dashboard/${campaign.id}`}>Manage</Link>
                                    </Button>
                                    <Button
                                        asChild
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                    >
                                        <Link href={`/editor?id=${campaign.id}`}>Edit</Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
