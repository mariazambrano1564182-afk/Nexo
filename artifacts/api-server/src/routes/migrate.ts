import { Router, type Request, type Response } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

/* ── Schema helpers ─────────────────────────────────────── */

async function buildTenantRow(comercio: any) {
  const [
    { data: invItems },
    { data: gastosItems },
    { data: ventasItems },
  ] = await Promise.all([
    supabase.from("inventario").select("*").eq("comercio_id", comercio.id).order("descripcion"),
    supabase.from("gastos").select("*").eq("comercio_id", comercio.id).order("fecha", { ascending: false }),
    supabase.from("ventas").select("*, ventas_detalle(*)").eq("comercio_id", comercio.id).order("fecha", { ascending: false }),
  ]);

  const inventario = (invItems || []).map((item: any) => ({
    sku:       item.codigo_barras || "",
    nombre:    item.descripcion,
    stock:     item.stock || 0,
    costoUSD:  item.costo || 0,
    precioUSD: item.precio_venta || 0,
    moneda:    item.moneda || "USD",
    _dbId:     item.id,
  }));

  const gastos = (gastosItems || []).map((g: any) => ({
    fecha:     g.fecha,
    categoria: g.categoria || "",
    desc:      g.descripcion || "",
    monto:     g.monto_usd || 0,
    moneda:    "USD",
    _dbId:     g.id,
  }));

  const ventas = (ventasItems || []).map((v: any) => {
    const items = (v.ventas_detalle || []).map((d: any) => ({
      nombre: d.producto_id || "",
      qty:    d.cantidad || 1,
      precio: d.precio_unitario_usd || 0,
    }));
    return {
      id:         `V-${String(v.id).slice(0, 8).toUpperCase()}`,
      fecha:      v.fecha,
      items,
      totalUSD:   v.total_usd || 0,
      totalBS:    v.total_bs || 0,
      bcv:        v.tasa_bcv || 0,
      metodoPago: v.metodo_pago || "",
      tenantKey:  comercio.id,
    };
  });

  // Monthly sales for current year
  const currentYear = new Date().getFullYear();
  const ventas_mes = Array(12).fill(0);
  for (const v of ventasItems || []) {
    const d = new Date(v.fecha);
    if (d.getFullYear() === currentYear) {
      ventas_mes[d.getMonth()] += Number(v.total_usd) || 0;
    }
  }

  const productos = inventario.map((item: any) => ({
    nombre: item.nombre,
    precio: item.precioUSD || 0,
  }));

  const totalVentas = (ventasItems || []).reduce((s: number, v: any) => s + (Number(v.total_usd) || 0), 0);
  const totalCount  = (ventasItems || []).length;

  return {
    id:         comercio.id,
    name:       comercio.nombre,
    rif:        comercio.rif || "",
    direccion:  comercio.direccion || "",
    type:       "Otro",
    plan:       "basico",
    city:       "",
    manager:    "",
    estado:     "Activo",
    zona_postal:"0000",
    kpis: {
      ventasUSD:  totalVentas,
      ticketProm: totalCount > 0 ? totalVentas / totalCount : 0,
      productos:  inventario.length,
      clientes:   0,
    },
    inventario,
    gastos,
    ventas,
    ventas_mes,
    productos,
  };
}

/* ── Seed data ──────────────────────────────────────────── */

const SEED_FERRETERIA_INV = [
  { codigo_barras:"FE-001", descripcion:"Taladro Inalámbrico 18V",   stock:22,  costo:65,  precio_venta:119, moneda:"USD", categoria:"Herramientas" },
  { codigo_barras:"FE-002", descripcion:"Caja Tornillos 1/4\" x100", stock:140, costo:3.2, precio_venta:6.5, moneda:"USD", categoria:"Ferretería" },
  { codigo_barras:"FE-003", descripcion:"Cemento Gris 42.5 kg",      stock:80,  costo:7,   precio_venta:12,  moneda:"USD", categoria:"Construcción" },
  { codigo_barras:"FE-004", descripcion:"Pintura Látex Blanca 1Gal", stock:35,  costo:14,  precio_venta:24,  moneda:"USD", categoria:"Pintura" },
  { codigo_barras:"FE-005", descripcion:"Cinta Aislante Negra",      stock:320, costo:2,   precio_venta:4,   moneda:"BS",  categoria:"Eléctrico" },
  { codigo_barras:"FE-006", descripcion:"Llave Inglesa 12\"",        stock:18,  costo:9,   precio_venta:17,  moneda:"USD", categoria:"Herramientas" },
];

const SEED_FERRETERIA_GASTOS = [
  { descripcion:"Local comercial Abril",   monto_usd:850,  categoria:"Alquiler",  fecha:"2026-04-22" },
  { descripcion:"Electricidad CORPOELEC",  monto_usd:60,   categoria:"Servicios", fecha:"2026-04-23" },
  { descripcion:"Flete proveedor cemento", monto_usd:120,  categoria:"Logística", fecha:"2026-04-25" },
  { descripcion:"Quincena vendedores",     monto_usd:640,  categoria:"Nómina",    fecha:"2026-04-27" },
];

const SEED_FARMACIA_INV = [
  { codigo_barras:"FA-001", descripcion:"Acetaminofén 500mg x20",    stock:320, costo:1.2, precio_venta:2.5, moneda:"USD", categoria:"Medicamentos" },
  { codigo_barras:"FA-002", descripcion:"Ibuprofeno 400mg x10",      stock:210, costo:1.8, precio_venta:3.4, moneda:"USD", categoria:"Medicamentos" },
  { codigo_barras:"FA-003", descripcion:"Amoxicilina 500mg x12",     stock:95,  costo:4.5, precio_venta:8,   moneda:"USD", categoria:"Medicamentos" },
  { codigo_barras:"FA-004", descripcion:"Vitamina C 1000mg x30",     stock:180, costo:3,   precio_venta:6,   moneda:"USD", categoria:"Vitaminas" },
  { codigo_barras:"FA-005", descripcion:"Alcohol Isopropílico 1L",   stock:60,  costo:4,   precio_venta:9,   moneda:"BS",  categoria:"Higiene" },
  { codigo_barras:"FA-006", descripcion:"Mascarilla Quirúrgica x50", stock:420, costo:2.5, precio_venta:5.5, moneda:"USD", categoria:"Higiene" },
];

const SEED_FARMACIA_GASTOS = [
  { descripcion:"Local farmacia Abril",   monto_usd:1400, categoria:"Alquiler",  fecha:"2026-04-20" },
  { descripcion:"Internet + telefonía",   monto_usd:95,   categoria:"Servicios", fecha:"2026-04-22" },
  { descripcion:"Lote antibióticos",      monto_usd:3200, categoria:"Compras",   fecha:"2026-04-24" },
  { descripcion:"Quincena farmacéuticos", monto_usd:1800, categoria:"Nómina",    fecha:"2026-04-26" },
];

/* ── Migration endpoint ─────────────────────────────────── */

router.post("/migrate", async (_req: Request, res: Response) => {
  try {
    // global_config default
    await supabase.from("global_config")
      .upsert({ key: "tasa_bcv", value: 36.50 }, { onConflict: "key", ignoreDuplicates: true });

    // Seed comercios only if none exist
    const { count } = await supabase.from("comercios").select("*", { count: "exact", head: true });
    if (!count || count === 0) {
      const { data: ferreteria } = await supabase.from("comercios")
        .insert({ nombre: "Ferretería El Centro", rif: "J-12345678-0", direccion: "Av. Principal del Centro, Local 4, Urb. El Centro" })
        .select().single();

      if (ferreteria) {
        await supabase.from("inventario").insert(SEED_FERRETERIA_INV.map(i => ({ ...i, comercio_id: ferreteria.id })));
        await supabase.from("gastos").insert(SEED_FERRETERIA_GASTOS.map(g => ({ ...g, comercio_id: ferreteria.id })));
      }

      const { data: farmacia } = await supabase.from("comercios")
        .insert({ nombre: "Farmacia Global", rif: "J-87654321-0", direccion: "Av. Bolívar Norte, CC Gran Valencia, Local 42" })
        .select().single();

      if (farmacia) {
        await supabase.from("inventario").insert(SEED_FARMACIA_INV.map(i => ({ ...i, comercio_id: farmacia.id })));
        await supabase.from("gastos").insert(SEED_FARMACIA_GASTOS.map(g => ({ ...g, comercio_id: farmacia.id })));
      }
    }

    // Seed super admin if no users exist
    const { count: userCount } = await supabase.from("usuarios").select("*", { count: "exact", head: true });
    if (!userCount || userCount === 0) {
      await supabase.from("usuarios").insert({
        username:        "andres",
        password_hash:   "nexo2026",
        nombre_completo: "Andrés Vega",
        rol:             "admin",
        comercio_id:     null,
      });
    }

    res.json({ ok: true, message: "Migración completada" });
  } catch (err: any) {
    console.error("[migrate]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Tenants (comercios) CRUD ───────────────────────────── */

router.get("/tenants", async (_req: Request, res: Response) => {
  try {
    const { data: comercios, error } = await supabase.from("comercios").select("*").order("nombre");
    if (error) { res.status(500).json({ error: error.message }); return; }
    const rows = await Promise.all((comercios || []).map(buildTenantRow));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/tenants/:id", async (req: Request, res: Response) => {
  try {
    const { data: comercio, error } = await supabase.from("comercios").select("*").eq("id", req.params.id).single();
    if (error || !comercio) { res.status(404).json({ error: "Comercio no encontrado" }); return; }
    const row = await buildTenantRow(comercio);
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/tenants", async (req: Request, res: Response) => {
  try {
    const { nombre, name, rif, direccion } = req.body;
    const nombreFinal = nombre || name;
    if (!nombreFinal) { res.status(400).json({ error: "nombre requerido" }); return; }

    const { data: comercio, error } = await supabase.from("comercios")
      .insert({ nombre: nombreFinal, rif: rif || "", direccion: direccion || "" })
      .select().single();

    if (error) { res.status(500).json({ error: error.message }); return; }
    const row = await buildTenantRow(comercio);
    res.status(201).json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/tenants/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, name, rif, direccion, inventario, gastos } = req.body;

    // Update basic comercio fields
    const updates: any = {};
    if (nombre || name) updates.nombre = nombre || name;
    if (rif !== undefined) updates.rif = rif;
    if (direccion !== undefined) updates.direccion = direccion;

    if (Object.keys(updates).length > 0) {
      await supabase.from("comercios").update(updates).eq("id", id);
    }

    // Replace inventario if provided
    if (Array.isArray(inventario)) {
      await supabase.from("inventario").delete().eq("comercio_id", id);
      if (inventario.length > 0) {
        const rows = inventario.map((item: any) => ({
          comercio_id:    id,
          codigo_barras:  item.sku || item.codigo_barras || "",
          descripcion:    item.nombre || item.descripcion,
          stock:          item.stock || 0,
          costo:          item.costoUSD || item.costo || 0,
          precio_venta:   item.precioUSD || item.precio_venta || 0,
          moneda:         item.moneda || "USD",
          categoria:      item.categoria || "",
        }));
        await supabase.from("inventario").insert(rows);
      }
    }

    // Replace gastos if provided
    if (Array.isArray(gastos)) {
      await supabase.from("gastos").delete().eq("comercio_id", id);
      if (gastos.length > 0) {
        const rows = gastos.map((g: any) => ({
          comercio_id: id,
          descripcion: g.desc || g.descripcion || "",
          monto_usd:   g.monto || g.monto_usd || 0,
          categoria:   g.categoria || "",
          fecha:       g.fecha || new Date().toISOString().split("T")[0],
        }));
        await supabase.from("gastos").insert(rows);
      }
    }

    const { data: comercio } = await supabase.from("comercios").select("*").eq("id", id).single();
    if (!comercio) { res.status(404).json({ error: "Comercio no encontrado" }); return; }
    const row = await buildTenantRow(comercio);
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/tenants/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Cascade delete related records
    await supabase.from("inventario").delete().eq("comercio_id", id);
    await supabase.from("gastos").delete().eq("comercio_id", id);

    // Delete ventas_detalle for ventas of this comercio
    const { data: ventas } = await supabase.from("ventas").select("id").eq("comercio_id", id);
    for (const v of ventas || []) {
      await supabase.from("ventas_detalle").delete().eq("venta_id", v.id);
    }
    await supabase.from("ventas").delete().eq("comercio_id", id);
    await supabase.from("comercios").delete().eq("id", id);

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Usuarios CRUD ──────────────────────────────────────── */

// Map frontend display roles → DB constraint values (lowercase)
const ROL_TO_DB: Record<string, string> = {
  "Super Admin": "admin",
  "Gerente":     "gerente",
  "Vendedor":    "vendedor",
  "Farmacéutico":"farmaceutico",
  "Operador":    "gerente",   // nearest valid equivalent
  "admin":       "admin",
  "gerente":     "gerente",
  "vendedor":    "vendedor",
  "farmaceutico":"farmaceutico",
};

// Map DB values → display labels
const ROL_TO_DISPLAY: Record<string, string> = {
  "admin":        "Super Admin",
  "gerente":      "Gerente",
  "vendedor":     "Vendedor",
  "farmaceutico": "Farmacéutico",
};

function normalizeRol(rol: string | undefined): string {
  if (!rol) return "gerente";
  return ROL_TO_DB[rol] ?? "gerente";
}

function mapUsuario(u: any) {
  const dbRol    = u.rol || "gerente";
  const display  = ROL_TO_DISPLAY[dbRol] || dbRol;
  return {
    id:        u.id,
    _dbId:     u.id,
    nombre:    u.nombre_completo || u.username,
    whatsapp:  u.whatsapp || "",
    usuario:   u.username,
    clave:     u.password_hash || "",
    comercio:  u.comercio_id || "all",
    rol:       display,
    estado:    "Activo",
    email:     u.email || "",
    vistas:    u.vistas || ["dashboard", "pos", "inventario", "clientes", "gastos", "reportes"],
  };
}

router.get("/usuarios", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("usuarios").select("*").order("nombre_completo");
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json((data || []).map(mapUsuario));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/usuarios", async (req: Request, res: Response) => {
  try {
    const { nombre, whatsapp, usuario, clave, comercio, rol, vistas } = req.body;
    if (!nombre || !usuario) { res.status(400).json({ error: "nombre y usuario requeridos" }); return; }

    const { data, error } = await supabase.from("usuarios").insert({
      nombre_completo: nombre,
      username:        usuario,
      password_hash:   clave || "",
      comercio_id:     comercio === "all" || !comercio ? null : comercio,
      rol:             normalizeRol(rol),
    }).select().single();

    if (error) {
      if (error.code === "23505") { res.status(409).json({ error: "Ese usuario ya existe" }); return; }
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json(mapUsuario(data));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/usuarios/:id", async (req: Request, res: Response) => {
  try {
    const update: any = {};
    if (req.body.nombre    !== undefined) update.nombre_completo = req.body.nombre;
    if (req.body.usuario   !== undefined) update.username        = req.body.usuario;
    if (req.body.clave     !== undefined) update.password_hash   = req.body.clave;
    if (req.body.comercio  !== undefined) update.comercio_id     = req.body.comercio === "all" ? null : req.body.comercio;
    if (req.body.rol       !== undefined) update.rol             = normalizeRol(req.body.rol);

    if (Object.keys(update).length === 0) { res.status(400).json({ error: "Nada que actualizar" }); return; }

    const { data, error } = await supabase.from("usuarios").update(update).eq("id", req.params.id).select().single();
    if (error || !data) { res.status(404).json({ error: "Usuario no encontrado" }); return; }
    res.json(mapUsuario(data));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/usuarios/:id", async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.from("usuarios").delete().eq("id", req.params.id);
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Global Config ──────────────────────────────────────── */

router.get("/global-config", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("global_config").select("key, value");
    if (error) { res.status(500).json({ error: error.message }); return; }
    const config: Record<string, any> = {};
    for (const row of data || []) config[row.key] = Number(row.value);
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/global-config/:key", async (req: Request, res: Response) => {
  try {
    const { value } = req.body;
    if (value === undefined) { res.status(400).json({ error: "value requerido" }); return; }
    const { data, error } = await supabase.from("global_config")
      .upsert({ key: req.params.key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
      .select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
