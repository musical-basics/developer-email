const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://quyqwdjygzalqqmrgkfk.supabase.co';
const supabaseKey = 'sb_secret_a2xA5WO4NSkdJCu34Q-iRg_hsPgnxjT'; // Service Key

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking for subscriber_events table...');
    const { data, error } = await supabase
        .from('subscriber_events')
        .select('id')
        .limit(1);

    if (error) {
        if (error.code === 'PGRST116' || error.message.includes('not found')) {
            console.log('Table subscriber_events does not exist.');
        } else {
            console.error('Error checking table:', error);
        }
    } else {
        console.log('Table subscriber_events exists.');
    }

    console.log('Checking for campaigns columns (opens, clicks)...');
    const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('opens, clicks')
        .limit(1);

    if (campaignError) {
        console.log('Columns opens/clicks might not exist in campaigns table.');
    } else {
        console.log('Columns opens/clicks exist in campaigns table.');
    }
}

checkSchema();
