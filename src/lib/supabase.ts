import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(
  url || "http://localhost:54321",
  anonKey || "missing-anon-key",
);

export type Person = { id: string; name: string };
export type ListItem = {
  id: string;
  person_id: string;
  text: string;
  created_at: string;
};
