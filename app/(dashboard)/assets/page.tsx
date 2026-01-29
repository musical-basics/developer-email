"use client"

import { useState, useCallback, useEffect } from "react"
import { Upload, ImageIcon, Loader2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Asset {
    id: string
    name: string
    url: string
    size?: number
    created_at?: string
}

export default function AssetsPage() {
    const [assets, setAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [isDragOver, setIsDragOver] = useState(false)
    const supabase = createClient()

    const fetchAssets = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase.storage.from("email-assets").list()

        if (error) {
            console.error("Error fetching assets:", error)
        } else if (data) {
            const loadedAssets: Asset[] = data.map((file) => ({
                id: file.id,
                name: file.name,
                url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/email-assets/${encodeURIComponent(file.name)}`,
                size: file.metadata?.size,
                created_at: file.created_at,
            }))
            setAssets(loadedAssets)
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchAssets()
    }, [fetchAssets])

    // Compress Image using Canvas
    const compressImage = async (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            const reader = new FileReader()

            reader.onload = (e) => {
                img.src = e.target?.result as string
            }
            reader.onerror = reject

            img.onload = () => {
                const canvas = document.createElement("canvas")
                const ctx = canvas.getContext("2d")
                if (!ctx) return reject(new Error("Canvas context failed"))

                const MAX_WIDTH = 1200
                const MAX_HEIGHT = 1200
                let width = img.width
                let height = img.height

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width
                        width = MAX_WIDTH
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height
                        height = MAX_HEIGHT
                    }
                }

                canvas.width = width
                canvas.height = height
                ctx.drawImage(img, 0, 0, width, height)

                canvas.toBlob(
                    (blob) => {
                        if (!blob) return reject(new Error("Compression failed"))
                        const compressedFile = new File([blob], file.name, {
                            type: "image/jpeg",
                            lastModified: Date.now(),
                        })
                        resolve(compressedFile)
                    },
                    "image/jpeg",
                    0.8,
                )
            }

            reader.readAsDataURL(file)
        })
    }

    const handleFileUpload = async (file: File) => {
        setUploading(true)

        try {
            let fileToUpload = file
            if (file.type.startsWith("image/")) {
                fileToUpload = await compressImage(file)
            }

            const fileName = `${Date.now()}-${fileToUpload.name}`
            const { error } = await supabase.storage.from("email-assets").upload(fileName, fileToUpload)

            if (error) {
                console.error("Error uploading file:", error)
            } else {
                await fetchAssets()
            }
        } catch (e) {
            console.error("Upload process failed:", e)
        }
        setUploading(false)
    }

    const handleDelete = async (asset: Asset) => {
        if (!confirm(`Delete "${asset.name}"? This cannot be undone.`)) return

        setDeleting(asset.id)
        const { error } = await supabase.storage.from("email-assets").remove([asset.name])

        if (error) {
            console.error("Error deleting asset:", error)
        } else {
            await fetchAssets()
        }
        setDeleting(null)
    }

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
    }, [])

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            setIsDragOver(false)
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0])
            }
        },
        [],
    )

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0])
        }
    }

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return "Unknown"
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Assets Library</h1>
                <p className="text-muted-foreground">Manage your email images and assets</p>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Upload New Asset</CardTitle>
                    <CardDescription>Images are automatically compressed for optimal email delivery</CardDescription>
                </CardHeader>
                <CardContent>
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById("asset-upload")?.click()}
                        className={cn(
                            "flex flex-col items-center justify-center gap-3 py-12 rounded-lg border-2 border-dashed transition-colors cursor-pointer",
                            isDragOver
                                ? "border-primary bg-primary/5"
                                : "border-muted-foreground/25 hover:border-primary hover:bg-primary/5",
                        )}
                    >
                        <input
                            id="asset-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        {uploading ? (
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        ) : (
                            <Upload className={cn("w-10 h-10", isDragOver ? "text-primary" : "text-muted-foreground")} />
                        )}
                        <p className="text-sm text-muted-foreground">
                            {uploading ? (
                                "Uploading..."
                            ) : (
                                <>
                                    Drag & drop or <span className="text-primary font-medium">click to upload</span>
                                </>
                            )}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Your Assets</CardTitle>
                    <CardDescription>Showing {assets.length} assets</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                        </div>
                    ) : assets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <ImageIcon className="w-12 h-12 text-muted-foreground mb-3" />
                            <p className="text-muted-foreground">No assets found. Upload one to get started.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {assets.map((asset) => (
                                <div
                                    key={asset.id}
                                    className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-border"
                                >
                                    <img
                                        src={asset.url || "/placeholder.svg"}
                                        alt={asset.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2">
                                        <p className="text-xs text-white truncate">{asset.name}</p>
                                        <p className="text-xs text-white/60">{formatFileSize(asset.size)}</p>
                                    </div>
                                    {/* Delete Button */}
                                    <button
                                        onClick={() => handleDelete(asset)}
                                        disabled={deleting === asset.id}
                                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                        title="Delete asset"
                                    >
                                        {deleting === asset.id ? (
                                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4 text-white" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
