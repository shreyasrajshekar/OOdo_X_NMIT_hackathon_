import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Supabase renamed the browser-safe key: new projects hand you a
// `sb_publishable_...` key, older ones a JWT-shaped anon key. Accept either so
// a .env.local written against either naming works.
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase is not configured. Copy .env.example to .env.local and fill in " +
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY from " +
      "Supabase -> Project Settings -> API.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
