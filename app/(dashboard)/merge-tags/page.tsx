"use client"

import { useEffect, useState } from "react"
import { Loader2, Save, Tags, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { getMergeTags, updateMergeTagDefault, type MergeTagRow } from "@/app/actions/merge-tags"

export default function MergeTagsPage() {
    const [tags, setTags] = useState<MergeTagRow[]>([])
    const [loading, setLoading] = useState(true)
    const [editedDefaults, setEditedDefaults] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState<string | null>(null)
    const [copied, setCopied] = useState<string | null>(null)
    const { toast } = useToast()

    useEffect(() => {
        loadTags()
    }, [])

    const loadTags = async () => {
        setLoading(true)
        const data = await getMergeTags()
        setTags(data)
        const defaults: Record<string, string> = {}
        data.forEach(t => { defaults[t.id] = t.default_value })
        setEditedDefaults(defaults)
        setLoading(false)
    }

    const handleSave = async (tag: MergeTagRow) => {
        const newDefault = editedDefaults[tag.id]
        if (newDefault === tag.default_value) return // no change
        setSaving(tag.id)
        try {
            await updateMergeTagDefault(tag.id, newDefault ?? "")
            toast({ title: "Saved", description: `Default for {{${tag.tag}}} updated.` })
            await loadTags()
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" })
        }
        setSaving(null)
    }

    const copyTag = (tag: string) => {
        navigator.clipboard.writeText(`{{${tag}}}`)
        setCopied(tag)
        setTimeout(() => setCopied(null), 2000)
    }

    if (loading) {
        return (
            <div className="p-6 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading merge tags...
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Merge Tags</h1>
                <p className="text-muted-foreground mt-1">
                    Define subscriber fields available in email templates. Use <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{"{{tag_name}}"}</code> in your emails to personalize content.
                </p>
            </div>

            {tags.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-12 text-center">
                    <Tags className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No merge tags configured.</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Run the SQL migration to seed the default merge tags.</p>
                </div>
            ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Field Label</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Merge Tag</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subscriber Field</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Default Value</th>
                                <th className="w-20 px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {tags.map(tag => {
                                const hasChanged = (editedDefaults[tag.id] ?? "") !== tag.default_value
                                return (
                                    <tr key={tag.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-foreground">{tag.field_label}</td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => copyTag(tag.tag)}
                                                className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded font-mono text-xs hover:bg-primary/20 transition-colors cursor-pointer"
                                                title="Click to copy"
                                            >
                                                {`{{${tag.tag}}}`}
                                                {copied === tag.tag ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 opacity-50" />}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{tag.subscriber_field}</td>
                                        <td className="px-4 py-3">
                                            <Input
                                                value={editedDefaults[tag.id] ?? ""}
                                                onChange={e => setEditedDefaults(prev => ({ ...prev, [tag.id]: e.target.value }))}
                                                placeholder="(empty)"
                                                className="h-8 text-sm max-w-[200px]"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            {hasChanged && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleSave(tag)}
                                                    disabled={saving === tag.id}
                                                    className="h-7 px-2 text-xs"
                                                >
                                                    {saving === tag.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">How it works</p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li>• Use <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">{"{{first_name}}"}</code> in your email templates to insert the subscriber&apos;s first name.</li>
                    <li>• If the subscriber&apos;s field is empty, the <strong>default value</strong> will be used instead.</li>
                    <li>• These merge tags work in both <strong>Campaigns</strong> and <strong>Automated Emails</strong>.</li>
                    <li>• Click any merge tag to copy it to your clipboard.</li>
                </ul>
            </div>
        </div>
    )
}
