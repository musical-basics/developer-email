const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://quyqwdjygzalqqmrgkfk.supabase.co';
const supabaseKey = 'sb_secret_a2xA5WO4NSkdJCu34Q-iRg_hsPgnxjT'; // Service Key

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log('Fetching one campaign row to check columns...');
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching campaign:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Existing columns in campaigns table:', Object.keys(data[0]));
        if ('opens' in data[0]) console.log('✅ opens column exists');
        else console.log('❌ opens column MISSING');
        if ('clicks' in data[0]) console.log('✅ clicks column exists');
        else console.log('❌ clicks column MISSING');
    } else {
        console.log('No campaigns found to check columns.');
    }
}

checkColumns();
