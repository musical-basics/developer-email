"use client"

import { useState, useMemo, useCallback } from "react"
import { AssetLoader } from "./asset-loader"
import { CodePane } from "./code-pane"
import { PreviewPane } from "./preview-pane"
import { renderTemplate } from "@/lib/render-template"

const DEFAULT_HTML = `<div><img src="{{hero_src}}" class="w-full" /> <h1>{{headline}}</h1></div>`

const DEFAULT_ASSETS: Record<string, string> = {
  hero_src: "https://via.placeholder.com/600x200",
  headline: "Welcome to the Tournament",
}

export function EmailEditor() {
  const [code, setCode] = useState(DEFAULT_HTML)
  const [assets, setAssets] = useState<Record<string, string>>(DEFAULT_ASSETS)

  // Extract variables from code using regex
  const extractedVariables = useMemo(() => {
    const regex = /\{\{(\w+)\}\}/g
    const matches: string[] = []
    let match
    while ((match = regex.exec(code)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1])
      }
    }
    return matches
  }, [code])

  // Update a single asset
  const updateAsset = useCallback((key: string, value: string) => {
    setAssets((prev) => ({ ...prev, [key]: value }))
  }, [])

  const previewHtml = useMemo(() => {
    return renderTemplate(code, assets)
  }, [code, assets])

  return (
    <div className="flex h-full bg-background text-foreground">
      {/* Left Sidebar - Asset Loader */}
      <AssetLoader variables={extractedVariables} assets={assets} onUpdateAsset={updateAsset} />

      {/* Center Pane - Code Editor */}
      <CodePane code={code} onChange={setCode} />

      {/* Right Pane - Preview */}
      <PreviewPane html={previewHtml} />
    </div>
  )
}
