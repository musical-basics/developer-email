import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const campaigns = [
  {
    id: 1,
    name: "Black Friday Promo",
    status: "Live",
    round: "Round 3",
    openRate: "15%",
    clickRate: "3.2%",
    actionLabel: "Manage Tournament",
    actionHref: "/dashboard/1",
  },
  {
    id: 2,
    name: "Weekly Update Nov 12",
    status: "Completed",
    round: "Final",
    openRate: "28%",
    clickRate: "5.8%",
    actionLabel: "View Results",
    actionHref: "/campaigns/2/results",
  },
  {
    id: 3,
    name: "Piano Masterclass",
    status: "Draft",
    round: "-",
    openRate: "-",
    clickRate: "-",
    actionLabel: "Edit Design",
    actionHref: "/editor",
  },
]

const statusStyles: Record<string, string> = {
  Live: "bg-green-500/20 text-green-400 border-green-500/30",
  Completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Draft: "bg-muted text-muted-foreground border-border",
}

export function CampaignsTable() {
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
            <TableHead className="text-muted-foreground">Last Round</TableHead>
            <TableHead className="text-muted-foreground">Open Rate</TableHead>
            <TableHead className="text-muted-foreground">Click Rate</TableHead>
            <TableHead className="text-right text-muted-foreground">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id} className="border-border">
              <TableCell className="font-medium text-card-foreground">{campaign.name}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusStyles[campaign.status]}>
                  {campaign.status}
                  {campaign.status === "Live" && ` (${campaign.round})`}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{campaign.round}</TableCell>
              <TableCell className="text-muted-foreground">{campaign.openRate}</TableCell>
              <TableCell className="text-muted-foreground">{campaign.clickRate}</TableCell>
              <TableCell className="text-right">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary/80 hover:bg-primary/10"
                >
                  <Link href={campaign.actionHref}>{campaign.actionLabel}</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
