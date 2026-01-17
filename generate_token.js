import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aekfevexhtrhzysrxikb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFla2ZldmV4aHRyaHp5c3J4aWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MzQwOTUsImV4cCI6MjA4NDIxMDA5NX0.eDLtfG0mtyuNbwYSvVxpJaH3GS4TZkUazGI0rTC7DzQ'; // public key is fine here

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: '123456',
  });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Access token:', data.session.access_token);
}

main();
