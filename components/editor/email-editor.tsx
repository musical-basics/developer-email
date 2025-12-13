"use client"

import { useState, useMemo, useCallback } from "react"
import { AssetLoader } from "./asset-loader"
import { CodePane } from "./code-pane"
import { PreviewPane } from "./preview-pane"
import { renderTemplate } from "@/lib/render-template"

interface EmailEditorProps {
    html: string
    assets: Record<string, string>
    onHtmlChange: (html: string) => void
    onAssetsChange: (assets: Record<string, string>) => void
    onSave?: () => void
}

export function EmailEditor({ html, assets, onHtmlChange, onAssetsChange, onSave }: EmailEditorProps) {
    // Extract variables from code using regex
    const extractedVariables = useMemo(() => {
        const regex = /\{\{(\w+)\}\}/g
        const matches: string[] = []
        let match
        while ((match = regex.exec(html)) !== null) {
            if (!matches.includes(match[1])) {
                matches.push(match[1])
            }
        }
        return matches
    }, [html])

    // Update a single asset
    const updateAsset = useCallback((key: string, value: string) => {
        onAssetsChange({ ...assets, [key]: value })
    }, [assets, onAssetsChange])

    const previewHtml = useMemo(() => {
        return renderTemplate(html, assets)
    }, [html, assets])

    return (
        <div className="flex h-full bg-background text-foreground">
            {/* Left Sidebar - Asset Loader */}
            <AssetLoader variables={extractedVariables} assets={assets} onUpdateAsset={updateAsset} />

            {/* Center Pane - Code Editor */}
            <CodePane code={html} onChange={onHtmlChange} />

            {/* Right Pane - Preview */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
                    <h2 className="text-sm font-semibold">Preview</h2>
                    {onSave && (
                        <button
                            onClick={onSave}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            Save Campaign
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-hidden">
                    <PreviewPane html={previewHtml} />
                </div>
            </div>
        </div>
    )
}
