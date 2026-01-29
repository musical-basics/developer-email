const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://quyqwdjygzalqqmrgkfk.supabase.co';
const supabaseKey = 'sb_secret_a2xA5WO4NSkdJCu34Q-iRg_hsPgnxjT';
const supabase = createClient(supabaseUrl, supabaseKey);
async function get() {
  const { data } = await supabase.from('campaigns').select('variable_values, html_content').eq('id', '8d9edeb5-934f-4a50-8655-7aa72428bb03').single();
  console.log(JSON.stringify(data, null, 2));
}
get();
