"use client"

import type { Subscriber } from "@/lib/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react"

interface SubscriberTableProps {
  subscribers: Subscriber[]
  selectedIds: string[]
  onSelectAll: () => void
  onSelectOne: (id: string) => void
  onEdit: (subscriber: Subscriber) => void
  onDelete: (id: string) => void
}

const tagColors: Record<string, string> = {
  Admin: "bg-red-500/20 text-red-400 border-red-500/30",
  Piano: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Student: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Theory: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  VIP: "bg-gold/20 text-gold border-gold/30",
  Beginner: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  Advanced: "bg-orange-500/20 text-orange-400 border-orange-500/30",
}

const statusStyles: Record<string, string> = {
  Active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Bounced: "bg-red-500/20 text-red-400 border-red-500/30",
  Unsubscribed: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function SubscriberTable({
  subscribers,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onEdit,
  onDelete,
}: SubscriberTableProps) {
  const allSelected = subscribers.length > 0 && selectedIds.length === subscribers.length
  const someSelected = selectedIds.length > 0 && selectedIds.length < subscribers.length

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected
                }}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>Profile</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Added</TableHead>
            <TableHead className="w-12">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscribers.map((subscriber) => (
            <TableRow
              key={subscriber.id}
              className="border-border cursor-pointer hover:bg-muted/50"
              onClick={() => onEdit(subscriber)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.includes(subscriber.id)}
                  onCheckedChange={() => onSelectOne(subscriber.id)}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                      {getInitials(subscriber.firstName, subscriber.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{subscriber.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {subscriber.firstName} {subscriber.lastName}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  {subscriber.tags.length > 0 ? (
                    subscriber.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className={tagColors[tag] || "bg-muted text-muted-foreground"}>
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(subscriber)
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add tag
                    </Button>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={statusStyles[subscriber.status]}>
                  {subscriber.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(subscriber.addedAt)}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(subscriber)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(subscriber.id)}
                      className="text-red-400 focus:text-red-400"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {subscribers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p>No subscribers found</p>
        </div>
      )}
    </div>
  )
}
