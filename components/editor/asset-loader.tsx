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
        return lower.includes("image") || lower.includes("url") || lower.endsWith("_src")
    }

    const isTextAreaVariable = (variable: string) => {
        const lower = variable.toLowerCase()
        return lower.includes("text") || lower.includes("paragraph")
    }

    const isFitVariable = (variable: string) => {
        return variable.toLowerCase().endsWith("_fit")
    }

    const handleImageUpload = (variable: string) => {
        setActiveVariable(variable)
    }

    const handleAssetSelect = (url: string) => {
        if (activeVariable) {
            onUpdateAsset(activeVariable, url)
        }
    }

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
                {variables.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No variables found. Add {"{{variable_name}}"} to your code.</p>
                ) : (
                    variables.map((variable) => (
                        <div key={variable} className="space-y-2">
                            <Label htmlFor={variable} className="text-xs font-mono text-muted-foreground">
                                {`{{${variable}}}`}
                            </Label>
                            {isTextAreaVariable(variable) ? (
                                <Textarea
                                    id={variable}
                                    value={assets[variable] || ""}
                                    onChange={(e) => onUpdateAsset(variable, e.target.value)}
                                    placeholder={`Enter ${variable}`}
                                    className="text-sm bg-muted border-border font-mono min-h-[100px] resize-y"
                                    rows={4}
                                />
                            ) : isFitVariable(variable) ? (
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
                            ) : isImageVariable(variable) ? (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <Input
                                            id={variable}
                                            value={assets[variable] || ""}
                                            onChange={(e) => onUpdateAsset(variable, e.target.value)}
                                            placeholder={`Enter ${variable}`}
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

                                    {/* Implicit Fit Control */}
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
                            ) : (
                                <Input
                                    id={variable}
                                    value={assets[variable] || ""}
                                    onChange={(e) => onUpdateAsset(variable, e.target.value)}
                                    placeholder={`Enter ${variable}`}
                                    className="flex-1 text-sm bg-muted border-border font-mono"
                                />
                            )}
                        </div>
                    ))
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
