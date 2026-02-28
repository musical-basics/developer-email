"use server"

import { createHash } from "crypto"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import * as cheerio from "cheerio"
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
        console.log("[Migration] Starting processMigration...")
        const htmlFile = formData.get("htmlFile") as File
        const templateName = (formData.get("templateName") as string) || "Untitled Migration"
        const aiMode = (formData.get("aiMode") as string) || "both"
        const geminiModel = (formData.get("geminiModel") as string) || ""
        const claudeModel = (formData.get("claudeModel") as string) || ""

        if (!htmlFile) {
            return { success: false, error: "No HTML file provided" }
        }

        console.log(`[Migration] File: ${htmlFile.name} (${htmlFile.size} bytes), mode: ${aiMode}`)

        // Collect image files from the form
        const imageFiles: File[] = []
        for (const [key, value] of formData.entries()) {
            if (key.startsWith("asset_") && value instanceof File) {
                imageFiles.push(value)
            }
        }
        console.log(`[Migration] ${imageFiles.length} asset files found`)

        // Step 1: Upload all images concurrently with hash dedup
        console.log("[Migration] Step 1: Uploading assets...")
        const t1 = Date.now()
        const assetMappings = await Promise.all(
            imageFiles.map((file) => uploadHashedAsset(file))
        )
        console.log(`[Migration] Step 1 done in ${Date.now() - t1}ms — ${assetMappings.length} assets uploaded`)

        // Step 2: Parse HTML for analysis info
        console.log("[Migration] Step 2: Parsing HTML...")
        const htmlContent = await htmlFile.text()
        const parsed = parseMailchimpHtml(htmlContent)
        console.log(`[Migration] Step 2 done — title: "${parsed.title}", ${parsed.blocks.length} blocks`)

        // Step 3: Run AI conversion with selected model(s)
        console.log(`[Migration] Step 3: Running AI conversion (mode: ${aiMode}, gemini: ${geminiModel}, claude: ${claudeModel})...`)
        const t3 = Date.now()
        const { generatedHtml } = await convertMailchimpToEmail(
            htmlContent,
            assetMappings,
            aiMode as "both" | "gemini" | "claude",
            geminiModel,
            claudeModel
        )
        console.log(`[Migration] Step 3 done in ${Date.now() - t3}ms — generated ${generatedHtml.length} chars`)

        // Step 4: Build variable_values map (variableName → Supabase public URL)
        const variableValues: Record<string, string> = {}
        for (const mapping of assetMappings) {
            variableValues[mapping.variableName] = mapping.url
        }

        // Step 5: Insert as Master Template using admin client for reliability
        console.log("[Migration] Step 5: Inserting campaign...")
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
            console.error("[Migration] Insert campaign error:", error)
            return { success: false, error: error.message }
        }

        console.log(`[Migration] Success! Campaign ID: ${data.id}`)
        return { success: true, campaignId: data.id }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown migration error"
        console.error("[Migration] Error:", message)
        if (err instanceof Error && err.stack) {
            console.error("[Migration] Stack:", err.stack)
        }
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

/**
 * Direct HTML import — faithful "carbon copy" of the Mailchimp email:
 * 1. Upload all image assets to Supabase with hash dedup
 * 2. Clean up Mailchimp boilerplate (MSO, archive bar, tracking)
 * 3. Replace image src URLs with uploaded Supabase URLs (matched by filename)
 * 4. Store the cleaned HTML directly — no AI rewriting, no block decomposition
 */
export async function processMigrationToDnd(formData: FormData): Promise<{
    success: boolean
    campaignId?: string
    error?: string
}> {
    try {
        const htmlFile = formData.get("htmlFile") as File
        const templateName = (formData.get("templateName") as string) || "Untitled Migration"

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

        console.log(`[DirectImport] File: ${htmlFile.name}, ${imageFiles.length} assets`)

        // Step 1: Upload all images concurrently with hash dedup
        const assetMappings = await Promise.all(
            imageFiles.map((file) => uploadHashedAsset(file))
        )
        console.log(`[DirectImport] Uploaded ${assetMappings.length} assets`)

        // Step 2: Read the HTML and clean Mailchimp boilerplate
        const rawHtml = await htmlFile.text()
        const $ = cheerio.load(rawHtml)

        // Remove Mailchimp-specific elements
        $("#awesomewrap").remove()        // Archive bar
        $(".mcnPreviewText").remove()     // Preview text container
        $("script").remove()              // Tracking scripts
        // Remove MSO conditional comments from raw HTML
        // (cheerio doesn't parse these, so we handle them on the string level later)

        // Step 3: Build filename → Supabase URL map from uploaded assets
        const filenameToUrl: Record<string, string> = {}
        for (const mapping of assetMappings) {
            // Map by original filename (e.g., "hero-image.png" → "https://supabase.../hash-hero-image.png")
            filenameToUrl[mapping.originalName.toLowerCase()] = mapping.url
            // Also map without extension for fuzzy matching
            const nameNoExt = mapping.originalName.replace(/\.[^.]+$/, "").toLowerCase()
            filenameToUrl[nameNoExt] = mapping.url
        }

        // Step 4: Replace image src attributes with uploaded Supabase URLs
        const variableValues: Record<string, string> = {}
        $("img").each((_: number, el: any) => {
            const $img = $(el)
            const originalSrc = $img.attr("src") || ""
            if (!originalSrc) return

            // Extract the filename from the original src URL
            const srcFilename = originalSrc.split("/").pop()?.split("?")[0]?.toLowerCase() || ""

            // Try exact filename match first
            let newUrl = filenameToUrl[srcFilename]

            // If no exact match, try matching without extension
            if (!newUrl) {
                const srcNoExt = srcFilename.replace(/\.[^.]+$/, "")
                newUrl = filenameToUrl[srcNoExt]
            }

            // If no match, try partial match (uploaded filename contained in src filename or vice versa)
            if (!newUrl) {
                for (const [uploadedName, url] of Object.entries(filenameToUrl)) {
                    if (srcFilename.includes(uploadedName) || uploadedName.includes(srcFilename)) {
                        newUrl = url
                        break
                    }
                }
            }

            if (newUrl) {
                $img.attr("src", newUrl)
                console.log(`[DirectImport] Replaced: ${srcFilename} → uploaded URL`)
                // Track in variable_values for reference
                const varName = toVariableName(srcFilename || `image_${_}`)
                variableValues[varName] = newUrl
            }
        })

        // Step 5: Get the cleaned HTML
        let cleanedHtml = $.html()

        // Remove MSO conditional comments at the string level
        cleanedHtml = cleanedHtml.replace(/<!--\[if mso\]>[\s\S]*?<!\[endif\]-->/gi, "")
        cleanedHtml = cleanedHtml.replace(/<!--\[if !mso\]><!-->/gi, "")
        cleanedHtml = cleanedHtml.replace(/<!--<!\[endif\]-->/gi, "")

        // Extract title for the campaign
        const title = $("title").text() || $('meta[property="og:title"]').attr("content") || templateName

        // Step 6: Insert campaign with raw HTML
        const admin = getAdminClient()
        const { data, error } = await admin
            .from("campaigns")
            .insert([{
                name: templateName,
                status: "draft",
                is_template: true,
                subject_line: title,
                html_content: cleanedHtml,
                variable_values: variableValues,
            }])
            .select()
            .single()

        if (error) {
            console.error("[DirectImport] Insert error:", error)
            return { success: false, error: error.message }
        }

        console.log(`[DirectImport] Success! Campaign ID: ${data.id}`)
        return { success: true, campaignId: data.id }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown migration error"
        console.error("[DirectImport] Error:", message)
        return { success: false, error: message }
    }
}
