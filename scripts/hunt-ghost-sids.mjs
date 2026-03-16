/**
 * Ghost SID Hunter
 * 
 * Scans campaign templates (html_content) for hardcoded ghost SIDs,
 * then finds which subscribers received those poisoned campaigns.
 * 
 * Usage: node --env-file=.env.local scripts/hunt-ghost-sids.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// The 5 known ghost SIDs extracted from analytics
const GHOST_SIDS = [
    '2c075b97-30f8-7057-12a4-1e3ce5d2e6be',
    '23ff8863-0fba-7f9a-1ce5-e9d4c3bb4ab9',
    '11ae5ff7-5852-7a3e-b477-c465d9984625',
    '66fab5bd-bcc3-7576-188d-613f049647f0',
];

// Generic pattern: any UUID-like string with "7" as version (3rd segment starts with 7)
const UUID_V7_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

async function main() {
    console.log('\n🔍 Scanning campaign templates for ghost SIDs...\n');

    // 1. Fetch all campaigns with html_content
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, name, html_content, created_at, parent_template_id')
        .not('html_content', 'is', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Failed to fetch campaigns:', error.message);
        process.exit(1);
    }

    console.log(`📋 Fetched ${campaigns.length} campaigns with HTML content\n`);

    const poisonedCampaigns = [];

    for (const campaign of campaigns) {
        const html = campaign.html_content || '';

        // Check for known ghost SIDs
        const foundGhosts = GHOST_SIDS.filter(sid => html.includes(sid));

        // Check for any UUID v7-like SIDs in URLs
        const sidMatches = html.match(/[?&]sid=([0-9a-f-]{36})/gi) || [];
        const cidMatches = html.match(/[?&]cid=([0-9a-f-]{36})/gi) || [];

        const hardcodedSids = sidMatches.map(m => m.replace(/[?&]sid=/i, ''));
        const hardcodedCids = cidMatches.map(m => m.replace(/[?&]cid=/i, ''));

        if (hardcodedSids.length > 0 || hardcodedCids.length > 0) {
            poisonedCampaigns.push({
                id: campaign.id,
                name: campaign.name,
                created_at: campaign.created_at,
                parent_template_id: campaign.parent_template_id,
                hardcodedSids: [...new Set(hardcodedSids)],
                hardcodedCids: [...new Set(hardcodedCids)],
                hasKnownGhosts: foundGhosts.length > 0,
                knownGhosts: foundGhosts,
            });
        }
    }

    if (poisonedCampaigns.length === 0) {
        console.log('✅ No campaigns found with hardcoded SIDs in their HTML!');
        console.log('   (The ghost SIDs may have been in child campaigns that were cleaned up)');
        return;
    }

    console.log(`\n⚠️  Found ${poisonedCampaigns.length} campaigns with hardcoded SID/CID in HTML:\n`);

    for (const pc of poisonedCampaigns) {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📧 Campaign: ${pc.name || '(unnamed)'}`);
        console.log(`   ID: ${pc.id}`);
        console.log(`   Created: ${pc.created_at}`);
        console.log(`   Parent: ${pc.parent_template_id || 'none'}`);
        console.log(`   Hardcoded SIDs: ${pc.hardcodedSids.join(', ')}`);
        console.log(`   Hardcoded CIDs: ${pc.hardcodedCids.join(', ')}`);
        if (pc.hasKnownGhosts) {
            console.log(`   🚨 CONTAINS KNOWN GHOST SIDs: ${pc.knownGhosts.join(', ')}`);
        }

        // Find who received this campaign
        const { data: sentHistory, error: sentErr } = await supabase
            .from('sent_history')
            .select('subscriber_id, sent_at')
            .eq('campaign_id', pc.id)
            .order('sent_at', { ascending: false })
            .limit(500);

        if (sentErr) {
            console.log(`   ❌ Could not query sent_history: ${sentErr.message}`);
        } else if (sentHistory && sentHistory.length > 0) {
            console.log(`   📨 Sent to ${sentHistory.length} subscribers`);

            // Fetch subscriber emails for the first 20
            const subIds = [...new Set(sentHistory.map(s => s.subscriber_id))].slice(0, 20);
            const { data: subs } = await supabase
                .from('subscribers')
                .select('id, email, first_name')
                .in('id', subIds);

            if (subs && subs.length > 0) {
                console.log(`   👥 Sample recipients:`);
                subs.forEach(s => {
                    console.log(`      - ${s.email} (${s.first_name || 'no name'}) [${s.id}]`);
                });
                if (sentHistory.length > 20) {
                    console.log(`      ... and ${sentHistory.length - 20} more`);
                }
            }
        } else {
            console.log(`   📨 No sent_history found (template only, never sent?)`);
        }
        console.log('');
    }

    // Summary
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n📊 Summary:`);
    console.log(`   Total poisoned campaigns: ${poisonedCampaigns.length}`);
    console.log(`   With known ghost SIDs: ${poisonedCampaigns.filter(p => p.hasKnownGhosts).length}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Clean the hardcoded ?sid= and ?cid= from these templates in Supabase`);
    console.log(`   2. The code fix (URL.searchParams.set) will prevent future ghost SIDs`);
    console.log(`   3. Re-send to affected subscribers if needed\n`);
}

main().catch(console.error);
