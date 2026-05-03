import { createClient } from "@supabase/supabase-js";

function getClient() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  return createClient(url, process.env.SUPABASE_ANON_KEY);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const sb = getClient();
  const { tenant_id, items } = req.body;
  if (!tenant_id || !Array.isArray(items)) return res.status(400).json({ error: "tenant_id e items requeridos" });

  const updated = [];
  for (const it of items) {
    const col = it.sku ? "sku" : "name";
    const val = it.sku || it.nombre;
    const { data: rows } = await sb.from("products").select("id, stock").eq("tenant_id", tenant_id).eq(col, val).limit(1);
    if (!rows || !rows[0]) continue;
    const newStock = Math.max(0, (rows[0].stock ?? 0) - (it.qty ?? 1));
    await sb.from("products").update({ stock: newStock, updated_at: new Date().toISOString() }).eq("id", rows[0].id);
    updated.push(rows[0].id);
  }
  res.json({ updated });
}
