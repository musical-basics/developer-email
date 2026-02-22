"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import { Upload, ImageIcon, ArrowLeft } from "lucide-react"
import { AssetPickerModal } from "./asset-picker-modal"

interface AssetLoaderProps {
    variables: string[]
    assets: Record<string, string>
    onUpdateAsset: (key: string, value: string) => void
    showBackButton?: boolean
}

export function AssetLoader({ variables, assets, onUpdateAsset, showBackButton = true }: AssetLoaderProps) {
    const [activeVariable, setActiveVariable] = useState<string | null>(null)

    const isImageVariable = (variable: string) => {
        const lower = variable.toLowerCase()
        if (lower.endsWith("_fit")) return false
        if (lower.endsWith("_link_url") || lower.includes("link_url")) return false
        return lower.includes("image") || lower.includes("url") || lower.endsWith("_src") || lower.endsWith("_bg") || lower.endsWith("_logo") || lower.endsWith("_icon") || lower.endsWith("_img")
    }

    const isLinkVariable = (variable: string) => {
        const lower = variable.toLowerCase()
        return lower.endsWith("_link_url") || lower.includes("link_url")
    }

    const isTextAreaVariable = (variable: string) => {
        const lower = variable.toLowerCase()
        return lower.includes("text") || lower.includes("paragraph")
    }

    const isFitVariable = (variable: string) => {
        return variable.toLowerCase().endsWith("_fit")
    }

    // Find the matching image variable for a link variable
    // e.g. "lifestyle_link_url" → looks for "lifestyle_img", "lifestyle_src", etc.
    const findPairedImageVar = (linkVar: string): string | null => {
        const prefix = linkVar.replace(/_?link_url$/i, "")
        if (!prefix) return null
        return variables.find(v => {
            const lower = v.toLowerCase()
            return lower.startsWith(prefix.toLowerCase()) && isImageVariable(v)
        }) || null
    }

    // Find the matching link variable for an image variable
    const findPairedLinkVar = (imageVar: string): string | null => {
        // Extract prefix: "lifestyle_img" → "lifestyle", "hero_src" → "hero"
        const prefix = imageVar.replace(/(_img|_src|_bg|_logo|_icon|_image)$/i, "")
        if (!prefix || prefix === imageVar) return null
        return variables.find(v => {
            const lower = v.toLowerCase()
            return lower === `${prefix.toLowerCase()}_link_url` || lower === `${prefix.toLowerCase()}link_url`
        }) || null
    }

    const handleImageUpload = (variable: string) => {
        setActiveVariable(variable)
    }

    const handleAssetSelect = (url: string) => {
        if (activeVariable) {
            onUpdateAsset(activeVariable, url)
        }
    }

    // Build grouped variables: skip link vars that are paired with an image (they'll render inside the image card)
    const pairedLinkVars = new Set<string>()
    variables.forEach(v => {
        if (isImageVariable(v)) {
            const linkVar = findPairedLinkVar(v)
            if (linkVar) pairedLinkVars.add(linkVar)
        }
    })

    // Also skip standalone _fit vars that are paired with images (they render inline)
    const pairedFitVars = new Set<string>()
    variables.forEach(v => {
        if (isImageVariable(v)) {
            const fitKey = `${v}_fit`
            if (variables.includes(fitKey)) pairedFitVars.add(fitKey)
        }
    })

    const displayVariables = variables.filter(v => !pairedLinkVars.has(v) && !pairedFitVars.has(v))

    return (
        <aside className="w-full h-full flex flex-col bg-card overflow-hidden">
            <div className="p-4 border-b border-border">
                {showBackButton && (
                    <Link href="/" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-3 h-3" />
                        Back to Dashboard
                    </Link>
                )}
                <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">
                        Asset Loader
                    </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Variables detected in your template</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {displayVariables.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No variables found. Add {"{{variable_name}}"} to your code.</p>
                ) : (
                    displayVariables.map((variable) => {
                        // ─── Image variable: render as a grouped card with optional link + fit ───
                        if (isImageVariable(variable)) {
                            const pairedLink = findPairedLinkVar(variable)
                            return (
                                <div key={variable} className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                                    {/* Image source */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor={variable} className="text-xs font-mono text-muted-foreground">
                                            {`{{${variable}}}`}
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id={variable}
                                                value={assets[variable] || ""}
                                                onChange={(e) => onUpdateAsset(variable, e.target.value)}
                                                placeholder={`Image URL`}
                                                className="flex-1 text-sm bg-muted border-border font-mono"
                                            />
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleImageUpload(variable)}
                                                title="Upload/Select Image"
                                                className="flex-shrink-0"
                                            >
                                                <Upload className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Fit Control */}
                                    <div className="flex gap-2 items-center">
                                        <Label className="text-xs text-muted-foreground w-12">Fit:</Label>
                                        <Select
                                            value={assets[`${variable}_fit`] || "cover"}
                                            onValueChange={(value) => onUpdateAsset(`${variable}_fit`, value)}
                                        >
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Fit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cover">Cover</SelectItem>
                                                <SelectItem value="contain">Contain</SelectItem>
                                                <SelectItem value="fill">Fill</SelectItem>
                                                <SelectItem value="scale-down">Scale Down</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Paired link URL */}
                                    {pairedLink && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor={pairedLink} className="text-xs font-mono text-muted-foreground">
                                                {`{{${pairedLink}}}`}
                                            </Label>
                                            <Input
                                                id={pairedLink}
                                                value={assets[pairedLink] || ""}
                                                onChange={(e) => onUpdateAsset(pairedLink, e.target.value)}
                                                placeholder="Link destination URL"
                                                className="text-sm bg-muted border-border font-mono"
                                            />
                                        </div>
                                    )}

                                    {/* Image preview */}
                                    {assets[variable] && (
                                        <div className="rounded border border-border overflow-hidden bg-muted/50 flex items-center justify-center p-2">
                                            <img
                                                src={assets[variable]}
                                                alt={variable}
                                                className="max-w-full max-h-32 object-contain"
                                                style={{
                                                    objectFit: (assets[`${variable}_fit`] as any) || "cover",
                                                    width: '100%',
                                                    height: '100px'
                                                }}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = "none"
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )
                        }

                        // ─── Standalone link variable (not paired with any image) ───
                        if (isLinkVariable(variable)) {
                            return (
                                <div key={variable} className="space-y-2">
                                    <Label htmlFor={variable} className="text-xs font-mono text-muted-foreground">
                                        {`{{${variable}}}`}
                                    </Label>
                                    <Input
                                        id={variable}
                                        value={assets[variable] || ""}
                                        onChange={(e) => onUpdateAsset(variable, e.target.value)}
                                        placeholder="Link destination URL"
                                        className="text-sm bg-muted border-border font-mono"
                                    />
                                </div>
                            )
                        }

                        // ─── Textarea variable ───
                        if (isTextAreaVariable(variable)) {
                            return (
                                <div key={variable} className="space-y-2">
                                    <Label htmlFor={variable} className="text-xs font-mono text-muted-foreground">
                                        {`{{${variable}}}`}
                                    </Label>
                                    <Textarea
                                        id={variable}
                                        value={assets[variable] || ""}
                                        onChange={(e) => onUpdateAsset(variable, e.target.value)}
                                        placeholder={`Enter ${variable}`}
                                        className="text-sm bg-muted border-border font-mono min-h-[100px] resize-y"
                                        rows={4}
                                    />
                                </div>
                            )
                        }

                        // ─── Fit variable (standalone, not paired) ───
                        if (isFitVariable(variable)) {
                            return (
                                <div key={variable} className="space-y-2">
                                    <Label htmlFor={variable} className="text-xs font-mono text-muted-foreground">
                                        {`{{${variable}}}`}
                                    </Label>
                                    <Select
                                        value={assets[variable] || "cover"}
                                        onValueChange={(value) => onUpdateAsset(variable, value)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select fit" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cover">Cover</SelectItem>
                                            <SelectItem value="contain">Contain</SelectItem>
                                            <SelectItem value="fill">Fill</SelectItem>
                                            <SelectItem value="scale-down">Scale Down</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )
                        }

                        // ─── Default: plain text input ───
                        return (
                            <div key={variable} className="space-y-2">
                                <Label htmlFor={variable} className="text-xs font-mono text-muted-foreground">
                                    {`{{${variable}}}`}
                                </Label>
                                <Input
                                    id={variable}
                                    value={assets[variable] || ""}
                                    onChange={(e) => onUpdateAsset(variable, e.target.value)}
                                    placeholder={`Enter ${variable}`}
                                    className="flex-1 text-sm bg-muted border-border font-mono"
                                />
                            </div>
                        )
                    })
                )}
            </div>

            <AssetPickerModal
                isOpen={!!activeVariable}
                onClose={() => setActiveVariable(null)}
                onSelect={handleAssetSelect}
            />
        </aside>
    )
}
