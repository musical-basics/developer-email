/**
 * Run the media_assets migration against Supabase.
 * Usage: npx tsx scripts/run-media-assets-migration.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://quyqwdjygzalqqmrgkfk.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";

if (!supabaseKey) {
    console.error("Missing SUPABASE_SERVICE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // Check if table already exists
    const { data, error } = await supabase.from("media_assets").select("id").limit(1);
    if (!error) {
        console.log("✅ media_assets table already exists — migration already applied.");
        return;
    }

    console.log("❗ media_assets table not found. Please run the following SQL in your Supabase SQL Editor:");
    console.log("File: supabase/migrations/20260224_create_media_assets.sql");
    console.log("");
    console.log(readFileSync("supabase/migrations/20260224_create_media_assets.sql", "utf8"));
}

run();
