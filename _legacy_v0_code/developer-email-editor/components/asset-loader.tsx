"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Upload, ImageIcon } from "lucide-react"

interface AssetLoaderProps {
  variables: string[]
  assets: Record<string, string>
  onUpdateAsset: (key: string, value: string) => void
}

export function AssetLoader({ variables, assets, onUpdateAsset }: AssetLoaderProps) {
  const isImageVariable = (variable: string) => {
    const lower = variable.toLowerCase()
    return lower.includes("image") || lower.includes("url") || lower.endsWith("_src")
  }

  const isTextAreaVariable = (variable: string) => {
    const lower = variable.toLowerCase()
    return lower.includes("text") || lower.includes("paragraph")
  }

  const handleImageUpload = (variable: string) => {
    // In a real app, this would open a file picker
    // For now, we'll prompt for a URL
    const url = prompt("Enter image URL:", assets[variable] || "")
    if (url !== null) {
      onUpdateAsset(variable, url)
    }
  }

  return (
    <aside className="w-[300px] flex-shrink-0 border-r border-border bg-card overflow-y-auto">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Asset Loader
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Variables detected in your template</p>
      </div>

      <div className="p-4 space-y-4">
        {variables.length === 0 ? (
          <p className="text-sm text-muted-foreground">No variables found. Add {"{{variable_name}}"} to your code.</p>
        ) : (
          variables.map((variable) => (
            <div key={variable} className="space-y-2">
              <Label htmlFor={variable} className="text-xs font-mono text-muted-foreground">
                {`{{${variable}}}`}
              </Label>
              {isTextAreaVariable(variable) ? (
                <Textarea
                  id={variable}
                  value={assets[variable] || ""}
                  onChange={(e) => onUpdateAsset(variable, e.target.value)}
                  placeholder={`Enter ${variable}`}
                  className="text-sm bg-muted border-border font-mono min-h-[100px] resize-y"
                  rows={4}
                />
              ) : (
                <div className="flex gap-2">
                  <Input
                    id={variable}
                    value={assets[variable] || ""}
                    onChange={(e) => onUpdateAsset(variable, e.target.value)}
                    placeholder={`Enter ${variable}`}
                    className="flex-1 text-sm bg-muted border-border font-mono"
                  />
                  {isImageVariable(variable) && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleImageUpload(variable)}
                      title="Upload/Select Image"
                      className="flex-shrink-0"
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
              {isImageVariable(variable) && assets[variable] && (
                <div className="mt-2 rounded border border-border overflow-hidden">
                  <img
                    src={assets[variable] || "/placeholder.svg"}
                    alt={variable}
                    className="w-full h-20 object-cover bg-muted"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
