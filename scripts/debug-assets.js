const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://quyqwdjygzalqqmrgkfk.supabase.co';
const supabaseKey = 'sb_secret_a2xA5WO4NSkdJCu34Q-iRg_hsPgnxjT'; // Service Key

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // 1. List files
  const { data: files, error } = await supabase.storage.from('email-assets').list('', { limit: 5, sortBy: { column: 'created_at', order: 'desc' } });
  
  if (error) {
    console.error('List Error:', error);
    return;
  }

  console.log('--- Recent Files ---');
  for (const file of files) {
    console.log('Name:', file.name);
    console.log('Metadata:', file.metadata);
    
    // Construct Public URL
    const rawUrl = `${supabaseUrl}/storage/v1/object/public/email-assets/${file.name}`;
    const encodedUrl = `${supabaseUrl}/storage/v1/object/public/email-assets/${encodeURIComponent(file.name)}`;
    
    console.log('Raw URL:', rawUrl);
    console.log('Encoded URL:', encodedUrl);
    console.log('---------------------');
  }
}

check();
