// scripts/create-edu-campaigns.js
// One-time script to create educational chain campaigns
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envFile = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
envFile.split("\n").forEach(line => {
    const [key, ...val] = line.split("=");
    if (key && val.length) process.env[key.trim()] = val.join("=").trim();
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const names = [
    "Auto: Edu 1 - Self-Taught Mistakes",
    "Auto: Edu 2 - Memorization",
    "Auto: Edu 3 - Scales",
    "Auto: Edu 4 - Playing Fast",
    "Auto: Edu 5 - Warm-Up",
];

async function main() {
    for (const name of names) {
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
