const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://quyqwdjygzalqqmrgkfk.supabase.co';
const supabaseKey = 'sb_secret_a2xA5WO4NSkdJCu34Q-iRg_hsPgnxjT'; // Service Key

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRPCs() {
    console.log('Checking for RPC functions...');

    // Try to call increment_opens with a fake ID just to see if it exists
    const { error: openError } = await supabase.rpc('increment_opens', { row_id: '00000000-0000-0000-0000-000000000000' });
    if (openError && openError.message.includes('not found')) {
        console.log('RPC increment_opens does NOT exist.');
    } else {
        console.log('RPC increment_opens exists or returned expected error.');
    }

    const { error: clickError } = await supabase.rpc('increment_clicks', { row_id: '00000000-0000-0000-0000-000000000000' });
    if (clickError && clickError.message.includes('not found')) {
        console.log('RPC increment_clicks does NOT exist.');
    } else {
        console.log('RPC increment_clicks exists or returned expected error.');
    }
}

checkRPCs();
