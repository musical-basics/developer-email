"use client"

import { useEffect, useRef, useState } from "react"

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

    // Expose view mode controller if needed, but for now we follow the exact layout request:
    // flex-1 bg-[#0a0a0a] h-full overflow-y-auto relative

    return (
        <div className="flex-1 bg-[#0a0a0a] h-full overflow-y-auto relative">
            <div className="min-h-full w-full flex justify-center p-8">
                <div
                    className="bg-white shadow-lg transition-all duration-300"
                    style={{
                        width: viewMode === "mobile" ? "375px" : "600px",
                        // Resetting height to auto so it grows with content
                        height: "max-content",
                        minHeight: "100%",
                        // Allow toggle externally if we refactor, but for now internal state
                    }}
                >
                    <iframe
                        ref={iframeRef}
                        title="Email Preview"
                        className="w-full h-full border-0"
                        style={{ minHeight: "800px" }} // Ensure substantial height
                        sandbox="allow-same-origin allow-scripts"
                    />
                </div>
            </div>

            {/* View Mode Toggle Overlay */}
            <div className="absolute bottom-4 right-4 flex items-center bg-black/50 backdrop-blur-sm p-1 rounded-md border border-white/10">
                <button
                    onClick={() => setViewMode("desktop")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${viewMode === "desktop"
                        ? "bg-white text-black"
                        : "text-white/70 hover:text-white"
                        }`}
                >
                    Desktop
                </button>
                <button
                    onClick={() => setViewMode("mobile")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${viewMode === "mobile"
                        ? "bg-white text-black"
                        : "text-white/70 hover:text-white"
                        }`}
                >
                    Mobile
                </button>
            </div>
        </div>
    )
}
