"use client"

import { useState } from "react"
import { AssetPicker } from "@/components/asset-picker"

export default function Home() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<{ id: string; name: string; url: string } | null>(null)

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-100">Musical Basics Engine</h1>
        <p className="text-neutral-500">Email Marketing Platform</p>
      </div>

      <button
        onClick={() => setIsOpen(true)}
        className="px-6 py-3 bg-amber-500 text-black font-medium rounded-md hover:bg-amber-400 transition-colors"
      >
        Open Asset Picker
      </button>

      {selectedAsset && (
        <div className="mt-4 p-4 rounded-lg bg-[#111111] border border-neutral-800">
          <p className="text-sm text-neutral-400 mb-2">Selected Asset:</p>
          <div className="flex items-center gap-3">
            <img
              src={selectedAsset.url || "/placeholder.svg"}
              alt={selectedAsset.name}
              className="w-12 h-12 rounded object-cover"
            />
            <span className="text-neutral-200">{selectedAsset.name}</span>
          </div>
        </div>
      )}

      {isOpen && (
        <AssetPicker
          onSelect={(asset) => {
            setSelectedAsset(asset)
            setIsOpen(false)
          }}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
