const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://quyqwdjygzalqqmrgkfk.supabase.co';
const supabaseKey = 'sb_secret_a2xA5WO4NSkdJCu34Q-iRg_hsPgnxjT';
const supabase = createClient(supabaseUrl, supabaseKey);

async function bulkFix() {
  const { data: campaigns } = await supabase.from('campaigns').select('id, name, variable_values');
  
  for (const camp of campaigns) {
    const vals = camp.variable_values || {};
    let changed = false;
    
    for (const [key, val] of Object.entries(vals)) {
      if (typeof val === 'string' && val.includes('email-assets') && val.includes(' ')) {
        console.log(`Fixing ${camp.name} [${key}]`);
        
        // Encode only the filename part to be safe
        const parts = val.split('/');
        const filename = parts.pop();
        const encodedFilename = encodeURIComponent(filename);
        const fixedUrl = [...parts, encodedFilename].join('/');
        
        vals[key] = fixedUrl;
        changed = true;
      }
    }
    
    if (changed) {
      const { error } = await supabase.from('campaigns').update({ variable_values: vals }).eq('id', camp.id);
      if (error) console.error(`Failed to update ${camp.name}`, error);
      else console.log(`SUCCESS: Updated ${camp.name}`);
    }
  }
}

bulkFix();
