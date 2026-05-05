import { Router, type Request, type Response } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

/* ── PRODUCTOS ─────────────────────────────────────────── */

router.get("/db/products", async (req: Request, res: Response) => {
  const { tenant_id } = req.query;
  if (!tenant_id) { res.status(400).json({ error: "tenant_id requerido" }); return; }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("tenant_id", tenant_id)
    .order("name");

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

router.post("/db/products", async (req: Request, res: Response) => {
  const { tenant_id, sku, name, stock, cost_usd, price_usd, currency } = req.body;
  if (!tenant_id || !name) { res.status(400).json({ error: "tenant_id y name requeridos" }); return; }

  const { data, error } = await supabase
    .from("products")
    .insert({
      tenant_id,
      sku: sku ?? "",
      name,
      stock: stock ?? 0,
      cost_usd: cost_usd ?? 0,
      price_usd: price_usd ?? 0,
      currency: currency ?? "USD",
    })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

router.put("/db/products/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { sku, name, stock, cost_usd, price_usd, currency } = req.body;

  const { data, error } = await supabase
    .from("products")
    .update({ sku, name, stock, cost_usd, price_usd, currency: currency ?? "USD", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) { res.status(404).json({ error: "Producto no encontrado" }); return; }
  res.json(data);
});

router.delete("/db/products/:id", async (req: Request, res: Response) => {
  const { error } = await supabase.from("products").delete().eq("id", req.params.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

/* ── VENTAS ────────────────────────────────────────────── */

router.get("/db/sales", async (req: Request, res: Response) => {
  const { tenant_id } = req.query;
  if (!tenant_id) { res.status(400).json({ error: "tenant_id requerido" }); return; }

  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("tenant_id", tenant_id)
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

router.post("/db/sales", async (req: Request, res: Response) => {
  const { tenant_id, items, total_usd, total_bs, bcv, metodo_pago, created_at } = req.body;
  if (!tenant_id) { res.status(400).json({ error: "tenant_id requerido" }); return; }

  const { data, error } = await supabase
    .from("sales")
    .insert({
      tenant_id,
      items: items ?? [],
      total_usd: total_usd ?? 0,
      total_bs: total_bs ?? 0,
      bcv: bcv ?? 0,
      metodo_pago: metodo_pago ?? "",
      created_at: created_at ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

/* ── STOCK (descuento masivo) ───────────────────────────── */

router.post("/db/products/deduct-stock", async (req: Request, res: Response) => {
  const { tenant_id, items } = req.body;
  if (!tenant_id || !Array.isArray(items)) {
    res.status(400).json({ error: "tenant_id e items requeridos" }); return;
  }

  const updated: string[] = [];

  for (const it of items) {
    const col = it.sku ? "sku" : "name";
    const val = it.sku || it.nombre;

    const { data } = await supabase
      .from("products")
      .select("id, stock")
      .eq("tenant_id", tenant_id)
      .eq(col, val)
      .single();

    if (!data) continue;

    const newStock = Math.max(0, (data.stock ?? 0) - (it.qty ?? 1));
    await supabase
      .from("products")
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq("id", data.id);

    updated.push(data.id);
  }

  res.json({ updated });
});

export default router;
