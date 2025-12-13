"use client"

import { useEffect, useRef, useState } from "react"
import { Eye, Monitor, Smartphone } from "lucide-react"

interface PreviewPaneProps {
  html: string
}

export function PreviewPane({ html }: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop")

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  margin: 0;
                  padding: 16px;
                  line-height: 1.5;
                }
                img { max-width: 100%; height: auto; }
              </style>
            </head>
            <body>${html}</body>
          </html>
        `)
        doc.close()
      }
    }
  }, [html])

  return (
    <div className="flex-1 flex flex-col bg-card">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Live Preview
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("desktop")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "desktop"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Desktop
            </button>
            <button
              onClick={() => setViewMode("mobile")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "mobile"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Mobile
            </button>
          </div>
          <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 font-medium">Live</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-muted/50 p-4 flex justify-center">
        <div
          className="bg-white shadow-lg transition-all duration-300"
          style={{
            width: viewMode === "mobile" ? "375px" : "600px",
            height: "100%",
          }}
        >
          <iframe
            ref={iframeRef}
            title="Email Preview"
            className="w-full h-full border-0"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  )
}
