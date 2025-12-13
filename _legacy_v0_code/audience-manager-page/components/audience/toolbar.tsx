"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Filter, Download, Upload, Plus } from "lucide-react"

interface ToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedTags: string[]
  allTags: string[]
  onTagToggle: (tag: string) => void
  onAddSubscriber: () => void
}

export function Toolbar({
  searchQuery,
  onSearchChange,
  selectedTags,
  allTags,
  onTagToggle,
  onAddSubscriber,
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 border-border bg-transparent">
              <Filter className="h-4 w-4" />
              Filter by Tag
              {selectedTags.length > 0 && (
                <span className="ml-1 rounded-full bg-gold px-2 py-0.5 text-xs text-gold-foreground">
                  {selectedTags.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {allTags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag}
                checked={selectedTags.includes(tag)}
                onCheckedChange={() => onTagToggle(tag)}
              >
                {tag}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button variant="secondary" className="gap-2">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
        <Button onClick={onAddSubscriber} className="gap-2 bg-gold text-gold-foreground hover:bg-gold/90">
          <Plus className="h-4 w-4" />
          Add Subscriber
        </Button>
      </div>
    </div>
  )
}
