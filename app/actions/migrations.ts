"use server"

import { createHash } from "crypto"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { convertMailchimpToEmail, AssetMapping } from "@/lib/ai/email-generator"
import { parseMailchimpHtml, generateContentSummary } from "@/lib/parsers/mailchimp-parser"

// Admin client that bypasses RLS for asset uploads
function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_KEY!
    return createClient(url, serviceKey)
}

/**
 * Sanitize a filename: lowercase, replace spaces/special chars with underscores
 */
function sanitizeFilename(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "_")
        .replace(/_+/g, "_")
}

/**
 * Create a Mustache-safe variable name from a filename.
 * e.g., "my-logo.png" → "my_logo_png_src"
 */
function toVariableName(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
        .toLowerCase() + "_src"
}

/**
 * Upload an image to Supabase with SHA-256 hash deduplication.
 * If the file already exists (same hash+name), it silently skips the upload.
 */
export async function uploadHashedAsset(file: File): Promise<AssetMapping> {
    const admin = getAdminClient()

    // Read file as ArrayBuffer and compute SHA-256 hash
    const buffer = await file.arrayBuffer()
    const hash = createHash("sha256")
        .update(Buffer.from(buffer))
        .digest("hex")
        .substring(0, 16) // First 16 chars for uniqueness

    const cleanName = sanitizeFilename(file.name)
    const storagePath = `${hash}-${cleanName}`

    // Try to upload with upsert: false (will error if file exists = dedup)
    const { error } = await admin.storage
        .from("email-assets")
        .upload(storagePath, Buffer.from(buffer), {
            contentType: file.type,
            upsert: false,
        })

    if (error && !error.message.includes("Duplicate") && !error.message.includes("already exists")) {
        // Real error, not a dedup collision
        console.error(`Upload error for ${file.name}:`, error.message)
    }

    // Get the public URL regardless of whether upload succeeded or file already existed
    const { data: urlData } = admin.storage
        .from("email-assets")
        .getPublicUrl(storagePath)

    const variableName = toVariableName(file.name)

    return {
        originalName: file.name,
        url: urlData.publicUrl,
        variableName,
    }
}

/**
 * Main migration pipeline:
 * 1. Upload all images with hash dedup
 * 2. Run AI conversion with asset mappings
 * 3. Insert as Master Template in campaigns table
 */
export async function processMigration(formData: FormData): Promise<{
    success: boolean
    campaignId?: string
    error?: string
}> {
    try {
        const htmlFile = formData.get("htmlFile") as File
        const templateName = (formData.get("templateName") as string) || "Untitled Migration"
        const aiMode = (formData.get("aiMode") as string) || "both"
        const geminiModel = (formData.get("geminiModel") as string) || ""
        const claudeModel = (formData.get("claudeModel") as string) || ""

        if (!htmlFile) {
            return { success: false, error: "No HTML file provided" }
        }

        // Collect image files from the form
        const imageFiles: File[] = []
        for (const [key, value] of formData.entries()) {
            if (key.startsWith("asset_") && value instanceof File) {
                imageFiles.push(value)
            }
        }

        // Step 1: Upload all images concurrently with hash dedup
        const assetMappings = await Promise.all(
            imageFiles.map((file) => uploadHashedAsset(file))
        )

        // Step 2: Parse HTML for analysis info
        const htmlContent = await htmlFile.text()
        const parsed = parseMailchimpHtml(htmlContent)

        // Step 3: Run AI conversion with selected model(s)
        const { generatedHtml } = await convertMailchimpToEmail(
            htmlContent,
            assetMappings,
            aiMode as "both" | "gemini" | "claude",
            geminiModel,
            claudeModel
        )

        // Step 4: Build variable_values map (variableName → Supabase public URL)
        const variableValues: Record<string, string> = {}
        for (const mapping of assetMappings) {
            variableValues[mapping.variableName] = mapping.url
        }

        // Step 5: Insert as Master Template using admin client for reliability
        const admin = getAdminClient()
        const { data, error } = await admin
            .from("campaigns")
            .insert([{
                name: templateName,
                status: "draft",
                is_template: true,
                subject_line: parsed.title || templateName,
                html_content: generatedHtml,
                variable_values: variableValues,
            }])
            .select()
            .single()

        if (error) {
            console.error("Insert campaign error:", error)
            return { success: false, error: error.message }
        }

        return { success: true, campaignId: data.id }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown migration error"
        console.error("Migration error:", message)
        return { success: false, error: message }
    }
}

/**
 * Quick analysis action (no AI, just parser) for the upload preview panel
 */
export async function analyzeMailchimpFile(htmlContent: string): Promise<{
    title: string
    previewText: string
    imageCount: number
    blockCount: number
    linkCount: number
    summary: string
}> {
    const parsed = parseMailchimpHtml(htmlContent)
    const summary = generateContentSummary(parsed)

    return {
        title: parsed.title,
        previewText: parsed.previewText,
        imageCount: parsed.images.length,
        blockCount: parsed.blocks.length,
        linkCount: parsed.links.length,
        summary,
    }
}
