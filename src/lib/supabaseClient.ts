import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://tukylkqpvzltzqrnfutc.supabase.co';

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1a3lsa3FwdnpsdHpxcm5mdXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3Mjg0NTEsImV4cCI6MjEwNTMwNDQ1MX0.Uk3EztSn1hLsAON3dhstC3BKd3_dmQr0_w84RzLVlX4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
