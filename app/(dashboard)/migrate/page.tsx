"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
    Upload,
    FileText,
    Image as ImageIcon,
    Sparkles,
    Loader2,
    CheckCircle2,
    AlertCircle,
    X,
} from "lucide-react"
import { processMigration, analyzeMailchimpFile } from "@/app/actions/migrations"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface AnalysisResult {
    title: string
    previewText: string
    imageCount: number
    blockCount: number
    linkCount: number
    summary: string
}

export default function MigratePage() {
    const router = useRouter()
    const { toast } = useToast()
    const [htmlFile, setHtmlFile] = useState<File | null>(null)
    const [assetFiles, setAssetFiles] = useState<File[]>([])
    const [templateName, setTemplateName] = useState("")
    const [isDragging, setIsDragging] = useState(false)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [isConverting, setIsConverting] = useState(false)
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const assetInputRef = useRef<HTMLInputElement>(null)

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const files = Array.from(e.dataTransfer.files)
        const html = files.find((f) => f.name.endsWith(".html") || f.name.endsWith(".htm"))
        const assets = files.filter(
            (f) =>
                f.name.endsWith(".png") ||
                f.name.endsWith(".jpg") ||
                f.name.endsWith(".jpeg") ||
                f.name.endsWith(".gif")
        )

        if (html) {
            setHtmlFile(html)
            setTemplateName(html.name.replace(/\.(html|htm)$/, ""))
            const text = await html.text()
            await runAnalysis(text)
        }
        if (assets.length > 0) {
            setAssetFiles((prev) => [...prev, ...assets])
        }
    }, [])

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setHtmlFile(file)
            setTemplateName(file.name.replace(/\.(html|htm)$/, ""))
            const text = await file.text()
            await runAnalysis(text)
        }
    }

    const handleAssetSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        setAssetFiles((prev) => [...prev, ...files])
    }

    const runAnalysis = async (htmlContent: string) => {
        setIsAnalyzing(true)
        setError(null)
        try {
            const result = await analyzeMailchimpFile(htmlContent)
            setAnalysis(result)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Analysis failed")
        } finally {
            setIsAnalyzing(false)
        }
    }

    const handleConvert = async () => {
        if (!htmlFile) return
        setIsConverting(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append("htmlFile", htmlFile)
            formData.append("templateName", templateName || "Untitled Migration")
            assetFiles.forEach((f, i) => formData.append(`asset_${i}`, f))

            const result = await processMigration(formData)

            if (result.success && result.campaignId) {
                toast({
                    title: "Migration Complete",
                    description: `"${templateName}" has been created as a Master Template.`,
                })
                router.push(`/editor?id=${result.campaignId}`)
            } else {
                setError(result.error || "Conversion failed")
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Conversion failed")
        } finally {
            setIsConverting(false)
        }
    }

    const resetState = () => {
        setHtmlFile(null)
        setAssetFiles([])
        setTemplateName("")
        setAnalysis(null)
        setError(null)
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-foreground">Mailchimp Import</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Upload a Mailchimp HTML export and its images. AI will convert it into a clean Master Template.
                </p>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mb-6 flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="w-4 h-4 text-destructive" />
                    </button>
                </div>
            )}

            {!htmlFile ? (
                /* ─── Drop Zone ─── */
                <Card
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed p-16 text-center transition-all duration-300 cursor-pointer
                        ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        Drag & Drop Source Files
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                        Drop your Mailchimp HTML export and image assets here, or click to browse.
                        Supports{" "}
                        <code className="text-primary">.html</code>,{" "}
                        <code className="text-primary">.png</code>,{" "}
                        <code className="text-primary">.jpg</code> files.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <Button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Select HTML File
                        </Button>
                        <Button
                            variant="outline"
                            type="button"
                            onClick={(e) => { e.stopPropagation(); assetInputRef.current?.click() }}
                        >
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Add Images
                        </Button>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".html,.htm"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <input
                        ref={assetInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleAssetSelect}
                    />
                </Card>
            ) : (
                /* ─── Analysis & Convert Panel ─── */
                <div className="grid grid-cols-5 gap-6">
                    {/* Left: Controls */}
                    <div className="col-span-2 space-y-4">
                        {/* File Info */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Source File</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                    <FileText className="w-5 h-5 text-primary" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {htmlFile.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {(htmlFile.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                    <button
                                        onClick={resetState}
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Template Name */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Template Name</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Input
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    placeholder="My Email Template"
                                />
                            </CardContent>
                        </Card>

                        {/* Assets */}
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm">
                                        Assets ({assetFiles.length})
                                    </CardTitle>
                                    <button
                                        onClick={() => assetInputRef.current?.click()}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        + Add
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {assetFiles.length > 0 ? (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {assetFiles.map((f, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                                            >
                                                <ImageIcon className="w-4 h-4 text-blue-400" />
                                                <span className="text-xs text-foreground truncate flex-1">
                                                    {f.name}
                                                </span>
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {(f.size / 1024).toFixed(0)} KB
                                                </Badge>
                                                <button
                                                    onClick={() =>
                                                        setAssetFiles((prev) => prev.filter((_, j) => j !== i))
                                                    }
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        No assets added. Drop images alongside the HTML file, or click &quot;+ Add&quot;.
                                    </p>
                                )}
                                <input
                                    ref={assetInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleAssetSelect}
                                />
                            </CardContent>
                        </Card>

                        {/* Convert Button */}
                        <Button
                            onClick={handleConvert}
                            disabled={isConverting || !htmlFile}
                            className="w-full h-12 text-base"
                            size="lg"
                        >
                            {isConverting ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Converting with AI...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Convert & Save as Template
                                </>
                            )}
                        </Button>

                        {isConverting && (
                            <p className="text-xs text-muted-foreground text-center">
                                Uploading images, analyzing structure, and generating HTML. This may take 30–60 seconds.
                            </p>
                        )}
                    </div>

                    {/* Right: Analysis Panel */}
                    <div className="col-span-3">
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    Content Analysis
                                    {isAnalyzing && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {analysis ? (
                                    <div className="space-y-4">
                                        {/* Title */}
                                        <div>
                                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                                                Detected Title
                                            </Label>
                                            <p className="text-sm font-medium text-foreground mt-1">{analysis.title}</p>
                                        </div>

                                        {/* Stats */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="p-3 rounded-lg bg-muted/50">
                                                <p className="text-lg font-bold text-foreground">{analysis.blockCount}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Blocks</p>
                                            </div>
                                            <div className="p-3 rounded-lg bg-muted/50">
                                                <p className="text-lg font-bold text-foreground">{analysis.imageCount}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Images</p>
                                            </div>
                                            <div className="p-3 rounded-lg bg-muted/50">
                                                <p className="text-lg font-bold text-foreground">{analysis.linkCount}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Links</p>
                                            </div>
                                        </div>

                                        {/* Preview Text */}
                                        {analysis.previewText && (
                                            <div>
                                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                                                    Preview Text
                                                </Label>
                                                <p className="text-xs text-foreground bg-muted/50 p-2 rounded-lg mt-1">
                                                    {analysis.previewText}
                                                </p>
                                            </div>
                                        )}

                                        {/* Content Summary */}
                                        <div>
                                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                                                Content Map
                                            </Label>
                                            <pre className="text-xs text-foreground bg-muted/50 p-3 rounded-lg overflow-auto max-h-64 font-mono whitespace-pre-wrap mt-1">
                                                {analysis.summary}
                                            </pre>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <FileText className="w-8 h-8 text-muted-foreground mb-3" />
                                        <p className="text-sm text-muted-foreground">
                                            Upload an HTML file to see the analysis
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    )
}
