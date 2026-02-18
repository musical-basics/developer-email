// scripts/create-chain-campaigns.js
// One-time script to create dummy campaigns for email chain tracking
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local manually
const envFile = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
envFile.split("\n").forEach(line => {
    const [key, ...val] = line.split("=");
    if (key && val.length) process.env[key.trim()] = val.join("=").trim();
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const campaignNames = [
    "Auto: DP Intro",
    "Auto: DP Crowdfund",
    "Auto: DP Price Increase",
    "Auto: Educational Weekly",
];

async function main() {
    for (const name of campaignNames) {
        const { data, error } = await supabase
            .from("campaigns")
            .insert({ name, status: "draft", subject_line: "" })
            .select("id, name")
            .single();

        if (error) {
            console.error(`Error creating "${name}":`, error.message);
        } else {
            console.log(`${data.name}: ${data.id}`);
        }
    }
}

main();
