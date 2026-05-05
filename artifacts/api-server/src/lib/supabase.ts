import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env["SUPABASE_URL"] ?? "";
const anonKey = process.env["SUPABASE_ANON_KEY"] ?? "";

if (!rawUrl || !anonKey) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set.");
}

const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");

export const supabase = createClient(supabaseUrl, anonKey);
