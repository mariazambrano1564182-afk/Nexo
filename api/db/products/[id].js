import { createClient } from "@supabase/supabase-js";

function getClient() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export default async function handler(req, res) {
  const sb = getClient();
  const { id } = req.query;

  if (req.method === "PUT") {
    const { sku, name, stock, cost_usd, price_usd, currency } = req.body;
    const { data, error } = await sb.from("products")
      .update({ sku, name, stock, cost_usd, price_usd, currency: currency ?? "USD", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select();
    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: "Producto no encontrado" });
    return res.json(data[0]);
  }

  if (req.method === "DELETE") {
    const { error } = await sb.from("products").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}
