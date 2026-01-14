"use client"

import { useState } from "react"
import { ModularEmailEditor } from "@/components/editor/modular-email-editor"

// Sample HTML to start with
const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
    <style>body { font-family: sans-serif; }</style>
</head>
<body>
    <div style="padding: 20px; background: #f0f0f0;">
        <h1>Welcome to Modular Mode</h1>
        <p>This is a separate test environment.</p>
    </div>
</body>
</html>`

export default function ModularPage() {
    const [html, setHtml] = useState(DEFAULT_HTML)
    const [assets, setAssets] = useState({})

    return (
        <ModularEmailEditor
            html={html}
            assets={assets}
            onHtmlChange={setHtml}
            onAssetsChange={setAssets}
            onSave={() => alert("Saved (Simulation)")}
        />
    )
}
