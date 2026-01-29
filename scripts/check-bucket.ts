import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://quyqwdjygzalqqmrgkfk.supabase.co';
const supabaseKey = 'sb_secret_a2xA5WO4NSkdJCu34Q-iRg_hsPgnxjT'; // Service Key

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.storage.getBucket('email-assets');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Bucket Info:', JSON.stringify(data, null, 2));
  }
}

check();
