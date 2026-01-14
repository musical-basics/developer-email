"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { AssetLoader } from "./asset-loader"
import { CodePane } from "./code-pane"
import { PreviewPane } from "./preview-pane"
import { CopilotPane } from "./copilot-pane"
import { renderTemplate } from "@/lib/render-template"
import { Monitor, Smartphone, Loader2, Check, PanelRightClose, PanelRightOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from "react-resizable-panels"

interface EmailEditorProps {
    html: string
    assets: Record<string, string>
    onHtmlChange: (html: string) => void
    onAssetsChange: (assets: Record<string, string>) => void
    onSave?: () => void
}

export function EmailEditor({ html, assets, onHtmlChange, onAssetsChange, onSave }: EmailEditorProps) {
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle')
    const [isCopilotOpen, setIsCopilotOpen] = useState(true)
    const copilotRef = useRef<ImperativePanelHandle>(null)

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

    const handleSaveClick = async () => {
        if (!onSave) return

        setSaveStatus('saving')

        // Execute the parent's save logic
        await Promise.resolve(onSave())

        // Show success for 2 seconds
        setSaveStatus('success')
        setTimeout(() => setSaveStatus('idle'), 2000)
    }

    const toggleCopilot = () => {
        const panel = copilotRef.current
        if (panel) {
            if (isCopilotOpen) {
                panel.collapse()
            } else {
                panel.expand()
            }
        }
    }

    return (
        <div className="h-screen bg-background text-foreground overflow-hidden">
            <PanelGroup direction="horizontal">
                {/* Left Sidebar - Asset Loader */}
                <Panel defaultSize={15} minSize={12} maxSize={25} className="bg-background border-r border-border">
                    <div className="h-full overflow-y-auto">
                        <AssetLoader variables={extractedVariables} assets={assets} onUpdateAsset={updateAsset} />
                    </div>
                </Panel>

                <PanelResizeHandle className="w-1 bg-border hover:bg-primary/20 transition-colors" />

                {/* Center Left - Code Pane */}
                <Panel defaultSize={30} minSize={20} className="bg-background border-r border-border">
                    <div className="h-full overflow-hidden">
                        <CodePane code={html} onChange={onHtmlChange} className="h-full" />
                    </div>
                </Panel>

                <PanelResizeHandle className="w-1 bg-border hover:bg-primary/20 transition-colors" />

                {/* Center Right - Preview Pane */}
                <Panel defaultSize={35} minSize={25} className="bg-background flex flex-col">
                    <div className="h-full flex flex-col overflow-hidden">
                        <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card flex-shrink-0">
                            <h2 className="text-sm font-semibold">Preview</h2>

                            <div className="flex items-center gap-2">
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

                                {/* Save Button */}
                                {onSave && (
                                    <button
                                        type="button"
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

                                {/* Copilot Toggle */}
                                <button
                                    onClick={toggleCopilot}
                                    className={cn(
                                        "p-2 rounded-md transition-all text-sm font-medium border ml-2",
                                        isCopilotOpen
                                            ? "bg-muted text-muted-foreground hover:text-foreground border-transparent"
                                            : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                    )}
                                    title={isCopilotOpen ? "Hide Copilot" : "Show Copilot"}
                                >
                                    {isCopilotOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-[#0f0f10] p-8">
                            <div className="h-fit min-h-[500px] mx-auto transition-all duration-300 bg-white shadow-lg my-8" style={{ maxWidth: viewMode === 'mobile' ? '375px' : '600px' }}>
                                <PreviewPane html={previewHtml} viewMode={viewMode} />
                            </div>
                        </div>
                    </div>
                </Panel>

                <PanelResizeHandle className={cn("w-1 bg-border hover:bg-primary/20 transition-colors", !isCopilotOpen && "hidden")} />

                {/* Right Sidebar - Copilot */}
                <Panel
                    ref={copilotRef}
                    defaultSize={20}
                    minSize={15}
                    maxSize={30}
                    collapsible={true}
                    collapsedSize={0}
                    onCollapse={() => setIsCopilotOpen(false)}
                    onExpand={() => setIsCopilotOpen(true)}
                    className={cn(
                        "bg-card border-l border-border transition-all duration-300 ease-in-out",
                        !isCopilotOpen && "border-none"
                    )}
                >
                    <div className="h-full overflow-hidden">
                        <CopilotPane html={html} onHtmlChange={onHtmlChange} />
                    </div>
                </Panel>
            </PanelGroup>
        </div>
    )
}
