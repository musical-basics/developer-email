"use client"

import { useState, useMemo, useCallback } from "react"
import { AssetLoader } from "./asset-loader"
import { CodePane } from "./code-pane"
import { PreviewPane } from "./preview-pane"
import { CopilotPane } from "./copilot-pane"
import { renderTemplate } from "@/lib/render-template"
import { Monitor, Smartphone, Loader2, Check } from "lucide-react" // Added Icons
import { cn } from "@/lib/utils"

interface EmailEditorProps {
    html: string
    assets: Record<string, string>
    onHtmlChange: (html: string) => void
    onAssetsChange: (assets: Record<string, string>) => void
    onSave?: () => void
}

export function EmailEditor({ html, assets, onHtmlChange, onAssetsChange, onSave }: EmailEditorProps) {
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')

    // NEW: Local state to show feedback on the button itself
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle')

    const extractedVariables = useMemo(() => {
        const regex = /\{\{(\w+)\}\}/g
        const matches: string[] = []
        let match
        while ((match = regex.exec(html)) !== null) {
            if (!matches.includes(match[1])) matches.push(match[1])
        }
        return matches
    }, [html])

    const updateAsset = useCallback((key: string, value: string) => {
        onAssetsChange({ ...assets, [key]: value })
    }, [assets, onAssetsChange])

    const previewHtml = useMemo(() => {
        return renderTemplate(html, assets)
    }, [html, assets])

    // NEW: Wrapper to handle the save visual feedback
    const handleSaveClick = async () => {
        if (!onSave) return

        setSaveStatus('saving')

        // Execute the parent's save logic
        // We await it just in case it's a promise, though standard void works too
        await Promise.resolve(onSave())

        // Show success for 2 seconds
        setSaveStatus('success')
        setTimeout(() => setSaveStatus('idle'), 2000)
    }

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">

            {/* Left Sidebar */}
            <div className="flex-shrink-0 w-[250px] border-r border-border h-full overflow-y-auto">
                <AssetLoader variables={extractedVariables} assets={assets} onUpdateAsset={updateAsset} />
            </div>

            {/* Center Left - Code */}
            <div className="flex-[3] min-w-[350px] border-r border-border h-full overflow-hidden">
                <CodePane code={html} onChange={onHtmlChange} className="h-full" />
            </div>

            {/* Center Right - Preview */}
            <div className="flex-[4] flex flex-col min-w-[500px] h-full overflow-hidden">
                <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card flex-shrink-0">
                    <h2 className="text-sm font-semibold">Preview</h2>

                    {/* View Toggle */}
                    <div className="flex bg-muted p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('desktop')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'desktop' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                            title="Desktop View"
                        >
                            <Monitor className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('mobile')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'mobile' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                            title="Mobile View"
                        >
                            <Smartphone className="w-4 h-4" />
                        </button>
                    </div>

                    {/* UPDATED SAVE BUTTON */}
                    {onSave && (
                        <button
                            type="button" // Safety: prevents accidental form submits
                            onClick={handleSaveClick}
                            disabled={saveStatus === 'saving'}
                            className={cn(
                                "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                                saveStatus === 'success'
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                            )}
                        >
                            {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                            {saveStatus === 'success' && <Check className="w-4 h-4" />}

                            {saveStatus === 'idle' && "Save Campaign"}
                            {saveStatus === 'saving' && "Saving..."}
                            {saveStatus === 'success' && "Saved!"}
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto bg-[#0f0f10] p-8">
                    <div className="h-fit min-h-[500px] mx-auto transition-all duration-300 bg-white shadow-lg my-8" style={{ maxWidth: viewMode === 'mobile' ? '375px' : '600px' }}>
                        <PreviewPane html={previewHtml} viewMode={viewMode} />
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
