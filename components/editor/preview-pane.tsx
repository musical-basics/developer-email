"use client"

import { useEffect, useRef, useState } from "react"

interface PreviewPaneProps {
    html: string
    viewMode?: 'desktop' | 'mobile'
}

export function PreviewPane({ html, viewMode = 'desktop' }: PreviewPaneProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [height, setHeight] = useState(800) // Default start height

    // Inject content and resize
    useEffect(() => {
        if (iframeRef.current) {
            const doc = iframeRef.current.contentDocument
            if (doc) {
                doc.open()
                doc.write(html)
                doc.close()

                // ⚡️ MAGIC FIX: Calculate the real height of the email content
                // We use a slight timeout to ensure images/fonts have started rendering
                setTimeout(() => {
                    if (doc.body) {
                        const newHeight = doc.body.scrollHeight + 50 // +50px buffer
                        setHeight(newHeight)
                    }
                }, 100)
            }
        }
    }, [html, viewMode])

    return (
        <div className="w-full h-full bg-white relative shadow-sm transition-all duration-300">
            <iframe
                ref={iframeRef}
                className="w-full border-0 transition-all duration-300"
                style={{ height: `${height}px` }} // ⚡️ Apply real pixel height
                title="Email Preview"
                sandbox="allow-same-origin allow-scripts"
            />
        </div>
    )
}
