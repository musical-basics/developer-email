const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://quyqwdjygzalqqmrgkfk.supabase.co';
const supabaseKey = 'sb_secret_a2xA5WO4NSkdJCu34Q-iRg_hsPgnxjT';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  const id = '8d9edeb5-934f-4a50-8655-7aa72428bb03';
  // 1. Get current
  const { data } = await supabase.from('campaigns').select('variable_values').eq('id', id).single();
  const values = data.variable_values;
  
  // 2. Fix URL
  const oldUrl = values.hero_src;
  const newUrl = encodeURI(oldUrl); // encodeURI should catch spaces
  // Or better, manually encode just the spaces if we want to be safe, but encodeURI is safest for full path
  // Actually, wait. The base URL part shouldn't be encoded if it has colons etc.
  // The filename part is what we want.
  
  // Custom fix: split by '/' and encode the last part
  const parts = oldUrl.split('/');
  const filename = parts.pop();
  const encodedFilename = encodeURIComponent(filename);
  const fixedUrl = [...parts, encodedFilename].join('/');

  console.log('Old:', oldUrl);
  console.log('New:', fixedUrl);

  values.hero_src = fixedUrl;

  // 3. Update
  const { error } = await supabase.from('campaigns').update({ variable_values: values }).eq('id', id);
  
  if (error) console.error('Update failed:', error);
  else console.log('Update success!');
}

fix();
