"use client"

import type React from "react"
import { useState, useCallback, useEffect } from "react"
import { X, Upload, ImageIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface Asset {
    id: string
    name: string
    url: string
}

interface AssetPickerModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (url: string) => void
}

export function AssetPickerModal({ isOpen, onClose, onSelect }: AssetPickerModalProps) {
    const [assets, setAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
    const [isDragOver, setIsDragOver] = useState(false)
    const supabase = createClient()

    const fetchAssets = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase.storage.from("email-assets").list()

        if (error) {
            console.error("Error fetching assets:", error)
        } else if (data) {
            const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL?.split(".")[0].split("//")[1]
            const loadedAssets: Asset[] = data.map((file) => ({
                id: file.id,
                name: file.name,
                url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/email-assets/${file.name}`,
            }))
            setAssets(loadedAssets)
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        if (isOpen) {
            fetchAssets()
        }
    }, [isOpen, fetchAssets])

    const handleFileUpload = async (file: File) => {
        console.log("Starting upload...", { name: file.name, type: file.type, size: file.size })
        setUploading(true)
        const fileName = `${Date.now()}-${file.name}`
        const { data, error } = await supabase.storage.from("email-assets").upload(fileName, file)

        if (error) {
            console.error("Error uploading file:", error)
        } else {
            console.log("Upload successful:", data)
            await fetchAssets()
        }
        setUploading(false)
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
        [fetchAssets],
    )

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0])
        }
    }

    const handleSelect = () => {
        if (selectedAsset) {
            onSelect(selectedAsset.url)
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-2xl mx-4 rounded-lg bg-[#111111] border border-neutral-800 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
                    <h3 className="text-lg font-medium text-neutral-100">Select Image Asset</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Main Content */}
                <div className="p-6 space-y-6">
                    {/* Upload Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById("file-upload")?.click()}
                        className={cn(
                            "flex flex-col items-center justify-center gap-3 py-10 rounded-lg border-2 border-dashed transition-colors cursor-pointer relative",
                            isDragOver
                                ? "border-amber-500 bg-amber-500/5"
                                : "border-neutral-700 hover:border-amber-500 hover:bg-amber-500/5",
                        )}
                    >
                        <input
                            id="file-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        {uploading ? (
                            <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                        ) : (
                            <Upload className={cn("w-10 h-10", isDragOver ? "text-amber-500" : "text-neutral-500")} />
                        )}
                        <p className="text-sm text-neutral-400">
                            {uploading ? (
                                "Uploading..."
                            ) : (
                                <>
                                    Drag & drop or <span className="text-amber-500 font-medium">click to upload</span>
                                </>
                            )}
                        </p>
                    </div>

                    {/* Asset Grid */}
                    <div className="max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
                            </div>
                        ) : assets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <ImageIcon className="w-12 h-12 text-neutral-600 mb-3" />
                                <p className="text-neutral-500">No assets found. Upload one to get started.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {assets.map((asset) => (
                                    <button
                                        key={asset.id}
                                        onClick={() => setSelectedAsset(asset)}
                                        className={cn(
                                            "group relative aspect-square rounded-md overflow-hidden bg-neutral-900 border-2 transition-all",
                                            selectedAsset?.id === asset.id
                                                ? "border-amber-500 ring-2 ring-amber-500/30"
                                                : "border-transparent hover:border-neutral-600",
                                        )}
                                    >
                                        <img
                                            src={asset.url || "/placeholder.svg"}
                                            alt={asset.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2">
                                            <p className="text-xs text-neutral-300 truncate">{asset.name}</p>
                                        </div>
                                        {selectedAsset?.id === asset.id && (
                                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                                                <svg
                                                    className="w-3 h-3 text-black"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800">
                    <p className="text-sm text-neutral-500">Showing {assets.length} assets</p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSelect}
                            disabled={!selectedAsset}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                selectedAsset
                                    ? "bg-amber-500 text-black hover:bg-amber-400"
                                    : "bg-neutral-700 text-neutral-500 cursor-not-allowed",
                            )}
                        >
                            Select Asset
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
