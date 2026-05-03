import { createClient } from "@supabase/supabase-js";

function getClient() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  return createClient(url, process.env.SUPABASE_ANON_KEY);
}

export default async function handler(req, res) {
  const sb = getClient();
  const { tenant_id } = req.query;

  if (req.method === "GET") {
    if (!tenant_id) return res.status(400).json({ error: "tenant_id requerido" });
    const { data, error } = await sb.from("products").select("*").eq("tenant_id", tenant_id).order("name");
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === "POST") {
    const { tenant_id: tid, sku, name, stock, cost_usd, price_usd, currency } = req.body;
    if (!tid || !name) return res.status(400).json({ error: "tenant_id y name requeridos" });
    const { data, error } = await sb.from("products")
      .insert([{ tenant_id: tid, sku: sku ?? "", name, stock: stock ?? 0, cost_usd: cost_usd ?? 0, price_usd: price_usd ?? 0, currency: currency ?? "USD" }])
      .select();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data[0]);
  }

  res.status(405).json({ error: "Method not allowed" });
}
