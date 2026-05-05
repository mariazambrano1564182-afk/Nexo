import { Router, type Request, type Response } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

/* ── Products (maps to inventario table) ────────────────── */

function mapInvToProduct(item: any) {
  return {
    id:        item.id,
    _dbId:     item.id,
    tenant_id: item.comercio_id,
    sku:       item.codigo_barras || "",
    name:      item.descripcion,
    stock:     item.stock || 0,
    cost_usd:  item.costo || 0,
    price_usd: item.precio_venta || 0,
    currency:  item.moneda || "USD",
    categoria: item.categoria || "",
  };
}

router.get("/db/products", async (req: Request, res: Response) => {
  try {
    let query = supabase.from("inventario").select("*").order("descripcion");
    if (req.query.tenant_id) {
      query = query.eq("comercio_id", req.query.tenant_id as string);
    }
    const { data, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json((data || []).map(mapInvToProduct));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/db/products", async (req: Request, res: Response) => {
  try {
    const { tenant_id, sku, name, stock, cost_usd, price_usd, currency, categoria } = req.body;
    if (!tenant_id || !name) { res.status(400).json({ error: "tenant_id y name son requeridos" }); return; }

    const { data, error } = await supabase.from("inventario").insert({
      comercio_id:   tenant_id,
      codigo_barras: sku || "",
      descripcion:   name,
      stock:         stock || 0,
      costo:         cost_usd || 0,
      precio_venta:  price_usd || 0,
      moneda:        currency || "USD",
      categoria:     categoria || "",
    }).select().single();

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(201).json(mapInvToProduct(data));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/db/products/:id", async (req: Request, res: Response) => {
  try {
    const updates: any = {};
    if (req.body.name      !== undefined) updates.descripcion   = req.body.name;
    if (req.body.sku       !== undefined) updates.codigo_barras = req.body.sku;
    if (req.body.stock     !== undefined) updates.stock         = req.body.stock;
    if (req.body.cost_usd  !== undefined) updates.costo         = req.body.cost_usd;
    if (req.body.price_usd !== undefined) updates.precio_venta  = req.body.price_usd;
    if (req.body.currency  !== undefined) updates.moneda        = req.body.currency;
    if (req.body.categoria !== undefined) updates.categoria     = req.body.categoria;

    const { data, error } = await supabase.from("inventario")
      .update(updates).eq("id", req.params.id).select().single();
    if (error || !data) { res.status(404).json({ error: "Producto no encontrado" }); return; }
    res.json(mapInvToProduct(data));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/db/products/:id", async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.from("inventario").delete().eq("id", req.params.id);
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Stock deduction ────────────────────────────────────── */

router.post("/db/products/deduct-stock", async (req: Request, res: Response) => {
  try {
    const { tenant_id, items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items requeridos" }); return;
    }

    const errors: string[] = [];
    for (const item of items) {
      const { nombre, qty, sku } = item;
      let query = supabase.from("inventario").select("id, stock");

      if (tenant_id) query = query.eq("comercio_id", tenant_id);
      if (sku)    query = query.eq("codigo_barras", sku);
      else if (nombre) query = query.ilike("descripcion", nombre);
      else continue;

      const { data: rows } = await query.limit(1);
      if (!rows || rows.length === 0) {
        errors.push(`Producto "${nombre || sku}" no encontrado`);
        continue;
      }
      const row = rows[0];
      const newStock = Math.max(0, (row.stock || 0) - (qty || 1));
      await supabase.from("inventario").update({ stock: newStock }).eq("id", row.id);
    }

    res.json({ ok: true, errors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Sales (ventas + ventas_detalle tables) ─────────────── */

function mapVenta(v: any) {
  const items = (v.ventas_detalle || []).map((d: any) => ({
    nombre: d.producto_id || "",
    qty:    d.cantidad || 1,
    precio: d.precio_unitario_usd || 0,
  }));
  return {
    id:          v.id,
    tenant_id:   v.comercio_id,
    items,
    total_usd:   v.total_usd || 0,
    total_bs:    v.total_bs || 0,
    bcv:         v.tasa_bcv || 0,
    metodo_pago: v.metodo_pago || "",
    created_at:  v.fecha,
  };
}

router.get("/db/sales", async (req: Request, res: Response) => {
  try {
    let query = supabase.from("ventas")
      .select("*, ventas_detalle(*)")
      .order("fecha", { ascending: false });
    if (req.query.tenant_id) {
      query = query.eq("comercio_id", req.query.tenant_id as string);
    }
    const { data, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json((data || []).map(mapVenta));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/db/sales", async (req: Request, res: Response) => {
  try {
    const { tenant_id, items, total_usd, total_bs, bcv, metodo_pago, created_at } = req.body;
    if (!tenant_id) { res.status(400).json({ error: "tenant_id requerido" }); return; }

    const { data: venta, error } = await supabase.from("ventas").insert({
      comercio_id:  tenant_id,
      total_usd:    total_usd || 0,
      total_bs:     total_bs || 0,
      tasa_bcv:     bcv || 0,
      metodo_pago:  metodo_pago || "",
      fecha:        created_at || new Date().toISOString(),
    }).select().single();

    if (error) { res.status(500).json({ error: error.message }); return; }

    if (Array.isArray(items) && items.length > 0) {
      const detalles = items.map((item: any) => ({
        venta_id:            venta.id,
        producto_id:         item.nombre || item.sku || "",
        cantidad:            item.qty || item.cantidad || 1,
        precio_unitario_usd: item.precio || item.price_usd || 0,
      }));
      await supabase.from("ventas_detalle").insert(detalles);
    }

    const { data: full } = await supabase.from("ventas")
      .select("*, ventas_detalle(*)")
      .eq("id", venta.id).single();

    res.status(201).json(mapVenta(full || venta));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
