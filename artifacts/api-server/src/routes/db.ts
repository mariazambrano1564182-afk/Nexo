import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";

const router = Router();

/* ── PRODUCTOS ─────────────────────────────────────────── */

router.get("/db/products", async (req: Request, res: Response) => {
  const { tenant_id } = req.query;
  if (!tenant_id) { res.status(400).json({ error: "tenant_id requerido" }); return; }
  const { rows } = await pool.query(
    "SELECT * FROM products WHERE tenant_id = $1 ORDER BY name",
    [tenant_id]
  );
  res.json(rows);
});

router.post("/db/products", async (req: Request, res: Response) => {
  const { tenant_id, sku, name, stock, cost_usd, price_usd, currency } = req.body;
  if (!tenant_id || !name) { res.status(400).json({ error: "tenant_id y name requeridos" }); return; }
  const { rows } = await pool.query(
    `INSERT INTO products (tenant_id, sku, name, stock, cost_usd, price_usd, currency)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [tenant_id, sku ?? "", name, stock ?? 0, cost_usd ?? 0, price_usd ?? 0, currency ?? "USD"]
  );
  res.status(201).json(rows[0]);
});

router.put("/db/products/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { sku, name, stock, cost_usd, price_usd, currency } = req.body;
  const { rows } = await pool.query(
    `UPDATE products SET sku=$1, name=$2, stock=$3, cost_usd=$4, price_usd=$5,
     currency=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
    [sku, name, stock, cost_usd, price_usd, currency ?? "USD", id]
  );
  if (rows.length === 0) { res.status(404).json({ error: "Producto no encontrado" }); return; }
  res.json(rows[0]);
});

router.delete("/db/products/:id", async (req: Request, res: Response) => {
  await pool.query("DELETE FROM products WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

/* ── VENTAS ────────────────────────────────────────────── */

router.get("/db/sales", async (req: Request, res: Response) => {
  const { tenant_id } = req.query;
  if (!tenant_id) { res.status(400).json({ error: "tenant_id requerido" }); return; }
  const { rows } = await pool.query(
    "SELECT * FROM sales WHERE tenant_id = $1 ORDER BY created_at DESC",
    [tenant_id]
  );
  res.json(rows);
});

router.post("/db/sales", async (req: Request, res: Response) => {
  const { tenant_id, items, total_usd, total_bs, bcv, metodo_pago, created_at } = req.body;
  if (!tenant_id) { res.status(400).json({ error: "tenant_id requerido" }); return; }
  const { rows } = await pool.query(
    `INSERT INTO sales (tenant_id, items, total_usd, total_bs, bcv, metodo_pago, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [tenant_id, JSON.stringify(items ?? []), total_usd ?? 0, total_bs ?? 0,
     bcv ?? 0, metodo_pago ?? "", created_at ?? new Date().toISOString()]
  );
  res.status(201).json(rows[0]);
});

/* ── STOCK (descuento masivo) ───────────────────────────── */

router.post("/db/products/deduct-stock", async (req: Request, res: Response) => {
  const { tenant_id, items } = req.body;
  if (!tenant_id || !Array.isArray(items)) {
    res.status(400).json({ error: "tenant_id e items requeridos" }); return;
  }
  const updated: number[] = [];
  for (const it of items) {
    const col = it.sku ? "sku" : "name";
    const val = it.sku || it.nombre;
    const { rows } = await pool.query(
      `SELECT id, stock FROM products WHERE tenant_id=$1 AND ${col}=$2 LIMIT 1`,
      [tenant_id, val]
    );
    if (!rows[0]) continue;
    const newStock = Math.max(0, (rows[0].stock ?? 0) - (it.qty ?? 1));
    await pool.query(
      "UPDATE products SET stock=$1, updated_at=NOW() WHERE id=$2",
      [newStock, rows[0].id]
    );
    updated.push(rows[0].id);
  }
  res.json({ updated });
});

export default router;
