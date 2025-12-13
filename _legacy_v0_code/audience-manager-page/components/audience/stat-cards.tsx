"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users, UserCheck, UserX } from "lucide-react"

interface StatCardsProps {
  total: number
  active: number
  unsubscribed: number
}

export function StatCards({ total, active, unsubscribed }: StatCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="bg-card border-border">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
            <Users className="h-6 w-6 text-gold" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Subscribers</p>
            <p className="text-3xl font-bold text-foreground">{total.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <UserCheck className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-3xl font-bold text-foreground">{active.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-500/10">
            <UserX className="h-6 w-6 text-zinc-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Unsubscribed</p>
            <p className="text-3xl font-bold text-foreground">{unsubscribed.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
