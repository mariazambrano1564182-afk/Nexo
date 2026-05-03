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
    const { data, error } = await sb.from("sales").select("*").eq("tenant_id", tenant_id).order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === "POST") {
    const { tenant_id: tid, items, total_usd, total_bs, bcv, metodo_pago, created_at } = req.body;
    if (!tid) return res.status(400).json({ error: "tenant_id requerido" });
    const { data, error } = await sb.from("sales")
      .insert([{ tenant_id: tid, items: items ?? [], total_usd: total_usd ?? 0, total_bs: total_bs ?? 0, bcv: bcv ?? 0, metodo_pago: metodo_pago ?? "", created_at: created_at ?? new Date().toISOString() }])
      .select();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data[0]);
  }

  res.status(405).json({ error: "Method not allowed" });
}
