const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://quyqwdjygzalqqmrgkfk.supabase.co';
const supabaseKey = 'sb_secret_a2xA5WO4NSkdJCu34Q-iRg_hsPgnxjT';
const supabase = createClient(supabaseUrl, supabaseKey);

async function scan() {
  const { data: campaigns, error } = await supabase.from('campaigns').select('id, name, variable_values');
  if (error) { console.error(error); return; }

  const needsFix = [];

  for (const camp of campaigns) {
    const vals = camp.variable_values || {};
    let broken = false;
    for (const [key, val] of Object.entries(vals)) {
      if (typeof val === 'string' && val.includes('email-assets') && val.includes(' ')) {
        console.log(`[Broken] Campaign: ${camp.name} (${camp.id})`);
        console.log(`   Key: ${key}`);
        console.log(`   Value: ${val}`);
        broken = true;
      }
    }
    if (broken) needsFix.push(camp);
  }

  console.log(`\nTotal campaigns to fix: ${needsFix.length}`);
}

scan();
