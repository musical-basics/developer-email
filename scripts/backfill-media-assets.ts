/**
 * Backfill script: scans the existing `email-assets` bucket and creates
 * `media_assets` records for every file found.
 *
 * Usage: npx tsx scripts/backfill-media-assets.ts
 *
 * Safe to re-run — skips files that already have a matching record.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://quyqwdjygzalqqmrgkfk.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";

if (!supabaseKey) {
    console.error("Missing SUPABASE_SERVICE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface BucketFile {
    name: string;
    id: string | null;
    metadata: { size?: number; mimetype?: string } | null;
    created_at: string;
}

async function listFilesRecursive(folder: string): Promise<{ path: string; file: BucketFile }[]> {
    const results: { path: string; file: BucketFile }[] = [];

    const { data, error } = await supabase.storage.from("email-assets").list(folder || "", {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
    });

    if (error) {
        console.error(`Error listing ${folder || "root"}:`, error);
        return results;
    }

    for (const item of data || []) {
        if (item.id === null) {
            // It's a folder — recurse
            const subPath = folder ? `${folder}/${item.name}` : item.name;
            const subResults = await listFilesRecursive(subPath);
            results.push(...subResults);
        } else if (item.name !== ".folder" && item.name !== ".emptyFolderPlaceholder") {
            const filePath = folder ? `${folder}/${item.name}` : item.name;
            results.push({ path: filePath, file: item as BucketFile });
        }
    }

    return results;
}

async function backfill() {
    console.log("🔍 Scanning email-assets bucket...");
    const files = await listFilesRecursive("");
    console.log(`   Found ${files.length} files\n`);

    if (files.length === 0) {
        console.log("Nothing to backfill.");
        return;
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const { path, file } of files) {
        // Derive folder_path and filename
        const parts = path.split("/");
        const filename = parts.pop()!;
        const folderPath = parts.join("/");

        // Build public URL (same pattern used in the app)
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/email-assets/${encodeURIComponent(path)}`;

        // Use the bucket path as the storage_hash for legacy files
        // (they weren't uploaded with content hashing, so we use the path as identifier)
        const storageHash = path;

        // Check if record already exists
        const { data: existing } = await supabase
            .from("media_assets")
            .select("id")
            .eq("storage_hash", storageHash)
            .eq("folder_path", folderPath)
            .limit(1);

        if (existing && existing.length > 0) {
            skipped++;
            continue;
        }

        // Insert new record
        const { error: insertError } = await supabase.from("media_assets").insert({
            filename,
            folder_path: folderPath,
            storage_hash: storageHash,
            public_url: publicUrl,
            size: (file.metadata as any)?.size || null,
            is_deleted: false,
        });

        if (insertError) {
            console.error(`   ❌ ${path}: ${insertError.message}`);
            errors++;
        } else {
            console.log(`   ✅ ${path}`);
            created++;
        }
    }

    console.log(`\n📊 Backfill complete:`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped (already exists): ${skipped}`);
    console.log(`   Errors: ${errors}`);
}

backfill();
