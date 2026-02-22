/**
 * Apply the tag_definitions migration via Supabase Management API.
 * Usage: npx tsx scripts/run-tag-definitions-migration.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // Check if table already exists
    const { data, error } = await supabase.from("tag_definitions").select("id").limit(1);
    if (!error) {
        console.log("✅ tag_definitions table already exists");
        return;
    }

    // Table doesn't exist — print the SQL for manual execution
    console.log("❗ tag_definitions table not found. Please run the following SQL in your Supabase SQL Editor:");
    console.log("File: supabase/migrations/20260225_create_tag_definitions.sql\n");
    console.log(readFileSync("supabase/migrations/20260225_create_tag_definitions.sql", "utf8"));
}

run();
