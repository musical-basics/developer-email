/**
 * One-time script to create the "sent-email-assets" public storage bucket.
 * Run with: npx tsx scripts/create-sent-bucket.ts
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://quyqwdjygzalqqmrgkfk.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";

if (!supabaseKey) {
    console.error("Missing SUPABASE_SERVICE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBucket() {
    // Check if bucket already exists
    const { data: existing } = await supabase.storage.getBucket("sent-email-assets");
    if (existing) {
        console.log("✅ Bucket 'sent-email-assets' already exists.");
        return;
    }

    const { data, error } = await supabase.storage.createBucket("sent-email-assets", {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB limit
    });

    if (error) {
        console.error("❌ Failed to create bucket:", error);
        process.exit(1);
    }

    console.log("✅ Created bucket 'sent-email-assets':", data);
}

createBucket();
