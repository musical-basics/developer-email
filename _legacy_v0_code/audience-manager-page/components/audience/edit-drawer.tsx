"use client"

import { useState, useEffect } from "react"
import type { Subscriber } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { X, Plus } from "lucide-react"

interface EditDrawerProps {
  subscriber: Subscriber | null
  isOpen: boolean
  onClose: () => void
  onSave: (subscriber: Subscriber) => void
  isNew?: boolean
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

export function EditDrawer({ subscriber, isOpen, onClose, onSave, isNew }: EditDrawerProps) {
  const [formData, setFormData] = useState<Subscriber>({
    id: "",
    email: "",
    firstName: "",
    lastName: "",
    tags: [],
    status: "Active",
    addedAt: new Date().toISOString().split("T")[0],
    notes: "",
  })
  const [newTag, setNewTag] = useState("")

  useEffect(() => {
    if (subscriber) {
      setFormData(subscriber)
    } else {
      setFormData({
        id: crypto.randomUUID(),
        email: "",
        firstName: "",
        lastName: "",
        tags: [],
        status: "Active",
        addedAt: new Date().toISOString().split("T")[0],
        notes: "",
      })
    }
  }, [subscriber])

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] })
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((tag) => tag !== tagToRemove) })
  }

  const handleSave = () => {
    onSave(formData)
    onClose()
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isNew ? "Add Subscriber" : "Edit Subscriber"}</SheetTitle>
          <SheetDescription>
            {isNew
              ? "Add a new subscriber to your audience."
              : "Update subscriber details. Changes map to variables like {{subscriber_first_name}} in emails."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Personal Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Personal Details</h3>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="subscriber@example.com"
                className="bg-card"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                  className="bg-card"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                  className="bg-card"
                />
              </div>
            </div>
          </div>

          {/* Tag Manager */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Tag Manager</h3>

            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a new tag..."
                className="bg-card"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
              />
              <Button type="button" onClick={handleAddTag} variant="secondary" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.tags.length > 0 ? (
                formData.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className={`${tagColors[tag] || "bg-muted text-muted-foreground"} pr-1`}
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 rounded-full p-0.5 hover:bg-foreground/10"
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove {tag} tag</span>
                    </button>
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tags added yet</p>
              )}
            </div>
          </div>

          {/* Internal Notes */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Internal Notes</h3>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add notes about this subscriber..."
              className="min-h-[100px] bg-card"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1 bg-gold text-gold-foreground hover:bg-gold/90">
              {isNew ? "Add Subscriber" : "Save Changes"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
