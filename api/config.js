export default function handler(req, res) {
  const url = (process.env.SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return res.status(503).json({ error: "Supabase not configured" });
  }
  res.setHeader("Cache-Control", "no-store");
  res.json({ supabaseUrl: url, supabaseAnonKey: anonKey });
}
