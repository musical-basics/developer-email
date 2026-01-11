"use client"

import { useState, useMemo, useCallback } from "react"
import { AssetLoader } from "./asset-loader"
import { CodePane } from "./code-pane"
import { PreviewPane } from "./preview-pane"
import { CopilotPane } from "./copilot-pane"
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
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* Left Sidebar - Asset Loader */}
            {/* ⚡️ FIX: Changed 'overflow-hidden' to 'overflow-y-auto' so you can scroll the list */}
            <div className="flex-shrink-0 w-[250px] border-r border-border h-full overflow-y-auto">
                <AssetLoader variables={extractedVariables} assets={assets} onUpdateAsset={updateAsset} />
            </div>

            {/* Center Left - Code Editor */}
            <div className="flex-[3] min-w-[350px] border-r border-border h-full overflow-hidden">
                <CodePane
                    code={html}
                    onChange={onHtmlChange}
                    className="h-full"
                />
            </div>

            {/* Center Right - Preview */}
            <div className="flex-[4] flex flex-col min-w-[500px] h-full overflow-hidden">
                <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card flex-shrink-0">
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
                {/* Internal scrolling for Preview */}
                <div className="flex-1 overflow-y-auto bg-[#0f0f10] p-8">
                    <div className="min-h-full mx-auto bg-white shadow-lg" style={{ maxWidth: '600px' }}>
                        <PreviewPane html={previewHtml} />
                    </div>
                </div>
            </div>

            {/* Right Sidebar - Copilot */}
            <div className="w-[350px] flex-shrink-0 border-l border-border bg-card h-full overflow-hidden">
                <CopilotPane html={html} onHtmlChange={onHtmlChange} />
            </div>
        </div>
    )
}
