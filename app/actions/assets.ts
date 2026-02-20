"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

function getSupabase() {
    return createClient(supabaseUrl, supabaseServiceKey)
}

export async function deleteAsset(filePath: string) {
    const supabase = getSupabase()

    const { error } = await supabase.storage.from("email-assets").remove([filePath])

    if (error) {
        console.error("Error deleting asset:", error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

export async function deleteAssets(filePaths: string[]) {
    const supabase = getSupabase()

    const { error } = await supabase.storage.from("email-assets").remove(filePaths)

    if (error) {
        console.error("Error bulk deleting assets:", error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

export async function moveAssets(moves: { oldPath: string; newPath: string }[]) {
    const supabase = getSupabase()
    const errors: string[] = []

    for (const { oldPath, newPath } of moves) {
        const { data: fileData, error: downloadError } = await supabase.storage
            .from("email-assets")
            .download(oldPath)

        if (downloadError || !fileData) {
            errors.push(`Download failed for ${oldPath}: ${downloadError?.message}`)
            continue
        }

        const { error: uploadError } = await supabase.storage
            .from("email-assets")
            .upload(newPath, fileData)

        if (uploadError) {
            errors.push(`Upload failed for ${newPath}: ${uploadError.message}`)
            continue
        }

        await supabase.storage.from("email-assets").remove([oldPath])
    }

    if (errors.length > 0) {
        return { success: false, error: errors.join("; ") }
    }

    return { success: true }
}

export async function listFolders() {
    const supabase = getSupabase()

    // List items at root level — folders appear as items with id=null
    const { data, error } = await supabase.storage.from("email-assets").list("", {
        limit: 200,
        sortBy: { column: "name", order: "asc" },
    })

    if (error) {
        console.error("Error listing folders:", error)
        return { folders: [], error: error.message }
    }

    // Supabase returns folders as entries with metadata.mimetype === undefined and id === null
    const folders = (data || [])
        .filter((item) => item.id === null)
        .map((item) => item.name)

    return { folders }
}

export async function createFolder(name: string) {
    const supabase = getSupabase()

    // Supabase Storage doesn't have real folders — upload a placeholder file
    const placeholder = new Blob([""], { type: "text/plain" })
    const { error } = await supabase.storage
        .from("email-assets")
        .upload(`${name}/.folder`, placeholder)

    if (error) {
        console.error("Error creating folder:", error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

export async function deleteFolder(name: string) {
    const supabase = getSupabase()

    // First, list all files in the folder
    const { data: files, error: listError } = await supabase.storage
        .from("email-assets")
        .list(name, { limit: 500 })

    if (listError) {
        console.error("Error listing folder contents:", listError)
        return { success: false, error: listError.message }
    }

    if (files && files.length > 0) {
        const filePaths = files.map((f) => `${name}/${f.name}`)
        const { error: removeError } = await supabase.storage
            .from("email-assets")
            .remove(filePaths)

        if (removeError) {
            console.error("Error deleting folder contents:", removeError)
            return { success: false, error: removeError.message }
        }
    }

    return { success: true }
}

export async function moveAsset(oldPath: string, newPath: string) {
    const supabase = getSupabase()

    // Supabase Storage has no native move — download, re-upload, delete
    const { data: fileData, error: downloadError } = await supabase.storage
        .from("email-assets")
        .download(oldPath)

    if (downloadError || !fileData) {
        console.error("Error downloading asset for move:", downloadError)
        return { success: false, error: downloadError?.message || "Download failed" }
    }

    const { error: uploadError } = await supabase.storage
        .from("email-assets")
        .upload(newPath, fileData)

    if (uploadError) {
        console.error("Error uploading asset to new path:", uploadError)
        return { success: false, error: uploadError.message }
    }

    const { error: deleteError } = await supabase.storage
        .from("email-assets")
        .remove([oldPath])

    if (deleteError) {
        console.error("Error deleting original asset after move:", deleteError)
        // File was copied but original not deleted — not ideal but not fatal
    }

    return { success: true }
}
