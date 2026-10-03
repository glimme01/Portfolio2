import { createClient } from '@supabase/supabase-js';

// TODO: Trage hier deine Supabase-Keys ein ODER nutze eine .env-Datei (empfohlen)
// Für Netlify-Deploy: Umgebungsvariablen im Netlify Dashboard setzen
const SUPABASE_URL_FALLBACK = 'https://DEIN-PROJEKT.supabase.co';
const SUPABASE_ANON_KEY_FALLBACK = 'DEIN-ANON-KEY';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_FALLBACK;

// Prüft ob echte Supabase-Credentials hinterlegt sind
export function isSupabaseConfigured() {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('DEIN-PROJEKT') &&
    !supabaseAnonKey.includes('DEIN-ANON-KEY') &&
    supabaseUrl.startsWith('https://')
  );
}

// Supabase Client (Dummy falls nicht konfiguriert)
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
