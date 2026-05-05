import { Router, type Request, type Response } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

const SEED_TENANTS = [
  {
    id: 'ferreteria',
    name: 'Ferretería El Centro',
    rif: 'J-12345678-0',
    direccion: 'Av. Principal del Centro, Local 4, Urb. El Centro',
    type: 'Ferretería',
    plan: 'pro',
    city: 'Caracas',
    manager: 'Luis Hernández',
    estado: 'Activo',
    zona_postal: '1010',
    kpis: { ventasUSD: 18420, ticketProm: 42.10, productos: 248, clientes: 612 },
    inventario: [
      { sku:'FE-001', nombre:'Taladro Inalámbrico 18V',     stock:22,  costoUSD:65,  precioUSD:119, moneda:'USD' },
      { sku:'FE-002', nombre:'Caja Tornillos 1/4" x100',    stock:140, costoUSD:3.2, precioUSD:6.5, moneda:'USD' },
      { sku:'FE-003', nombre:'Cemento Gris 42.5 kg',        stock:80,  costoUSD:7,   precioUSD:12,  moneda:'USD' },
      { sku:'FE-004', nombre:'Pintura Látex Blanca 1Gal',   stock:35,  costoUSD:14,  precioUSD:24,  moneda:'USD' },
      { sku:'FE-005', nombre:'Cinta Aislante Negra',        stock:320, costoBS:45,   precioBS:90,   moneda:'BS'  },
      { sku:'FE-006', nombre:'Llave Inglesa 12"',           stock:18,  costoUSD:9,   precioUSD:17,  moneda:'USD' },
    ],
    gastos: [
      { fecha:'2026-04-22', categoria:'Alquiler',  desc:'Local comercial Abril',   monto:850,  moneda:'USD' },
      { fecha:'2026-04-23', categoria:'Servicios', desc:'Electricidad CORPOELEC',  monto:1200, moneda:'BS'  },
      { fecha:'2026-04-25', categoria:'Logística', desc:'Flete proveedor cemento', monto:120,  moneda:'USD' },
      { fecha:'2026-04-27', categoria:'Nómina',    desc:'Quincena vendedores',     monto:640,  moneda:'USD' },
    ],
    ventas: [],
    ventas_mes: [12,18,14,22,19,26,24,28,23,31,29,35],
    productos: [
      { nombre:'Taladro Inalámbrico 18V', precio:119  },
      { nombre:'Cemento 42.5 kg',         precio:12   },
      { nombre:'Pintura Látex 1Gal',      precio:24   },
      { nombre:'Llave Inglesa 12"',       precio:17   },
      { nombre:'Caja Tornillos x100',     precio:6.5  },
      { nombre:'Cinta Aislante',          precio:2.5  },
    ],
  },
  {
    id: 'farmacia',
    name: 'Farmacia Global',
    rif: 'J-87654321-0',
    direccion: 'Av. Bolívar Norte, CC Gran Valencia, Local 42',
    type: 'Farmacia',
    plan: 'pro',
    city: 'Valencia',
    manager: 'María Rodríguez',
    estado: 'Activo',
    zona_postal: '2001',
    kpis: { ventasUSD: 27890, ticketProm: 18.40, productos: 612, clientes: 1840 },
    inventario: [
      { sku:'FA-001', nombre:'Acetaminofén 500mg x20',   stock:320, costoUSD:1.2, precioUSD:2.5, moneda:'USD' },
      { sku:'FA-002', nombre:'Ibuprofeno 400mg x10',     stock:210, costoUSD:1.8, precioUSD:3.4, moneda:'USD' },
      { sku:'FA-003', nombre:'Amoxicilina 500mg x12',    stock:95,  costoUSD:4.5, precioUSD:8,   moneda:'USD' },
      { sku:'FA-004', nombre:'Vitamina C 1000mg x30',    stock:180, costoUSD:3,   precioUSD:6,   moneda:'USD' },
      { sku:'FA-005', nombre:'Alcohol Isopropílico 1L',  stock:60,  costoBS:90,   precioBS:180,  moneda:'BS'  },
      { sku:'FA-006', nombre:'Mascarilla Quirúrgica x50',stock:420, costoUSD:2.5, precioUSD:5.5, moneda:'USD' },
    ],
    gastos: [
      { fecha:'2026-04-20', categoria:'Alquiler',  desc:'Local farmacia Abril',   monto:1400, moneda:'USD' },
      { fecha:'2026-04-22', categoria:'Servicios', desc:'Internet + telefonía',   monto:95,   moneda:'USD' },
      { fecha:'2026-04-24', categoria:'Compras',   desc:'Lote antibióticos',      monto:3200, moneda:'USD' },
      { fecha:'2026-04-26', categoria:'Nómina',    desc:'Quincena farmacéuticos', monto:1800, moneda:'USD' },
    ],
    ventas: [],
    ventas_mes: [22,25,27,30,28,33,35,38,36,41,44,47],
    productos: [
      { nombre:'Acetaminofén 500mg', precio:2.5 },
      { nombre:'Ibuprofeno 400mg',   precio:3.4 },
      { nombre:'Amoxicilina 500mg',  precio:8   },
      { nombre:'Vitamina C 1000mg',  precio:6   },
      { nombre:'Mascarilla x50',     precio:5.5 },
      { nombre:'Alcohol 1L',         precio:4.9 },
    ],
  },
];

const SEED_USUARIOS = [
  { nombre:'Luis Hernández',  whatsapp:'', usuario:'luis',   clave:'', comercio:'ferreteria', rol:'Gerente',      estado:'Activo', email:'luis@nexo.io',   vistas:['dashboard','pos','inventario','gastos','reportes'] },
  { nombre:'María Rodríguez', whatsapp:'', usuario:'maria',  clave:'', comercio:'farmacia',   rol:'Gerente',      estado:'Activo', email:'maria@nexo.io',  vistas:['dashboard','pos','inventario','gastos','reportes'] },
  { nombre:'Andrés Vega',     whatsapp:'', usuario:'andres', clave:'nexo2026', comercio:'all', rol:'Super Admin', estado:'Activo', email:'andres@nexo.io', vistas:['dashboard','pos','inventario','gastos','reportes','usuarios','configuracion','infraestructura'] },
];

router.post("/migrate", async (_req: Request, res: Response) => {
  try {
    // Seed global_config
    await supabase
      .from("global_config")
      .upsert({ key: "tasa_bcv", value: 36.50 }, { onConflict: "key", ignoreDuplicates: true });

    // Seed tenants only if none exist
    const { count: tenantCount } = await supabase
      .from("tenants")
      .select("*", { count: "exact", head: true });

    if (!tenantCount || tenantCount === 0) {
      await supabase.from("tenants").upsert(SEED_TENANTS, { onConflict: "id", ignoreDuplicates: true });
    }

    // Seed usuarios only if fewer than 3 exist (allow user-created ones)
    const { count: userCount } = await supabase
      .from("usuarios")
      .select("*", { count: "exact", head: true });

    if (!userCount || userCount === 0) {
      await supabase.from("usuarios").upsert(SEED_USUARIOS, { onConflict: "usuario", ignoreDuplicates: true });
    }

    res.json({ ok: true, message: "Migración completada" });
  } catch (err: any) {
    console.error("[migrate]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Tenants CRUD ───────────────────────────────────────── */

router.get("/tenants", async (_req: Request, res: Response) => {
  const { data, error } = await supabase.from("tenants").select("*").order("name");
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

router.get("/tenants/:id", async (req: Request, res: Response) => {
  const { data, error } = await supabase.from("tenants").select("*").eq("id", req.params.id).single();
  if (error || !data) { res.status(404).json({ error: "Tenant no encontrado" }); return; }
  res.json(data);
});

router.post("/tenants", async (req: Request, res: Response) => {
  const { id, name, rif, direccion, type, plan, city, manager, zona_postal } = req.body;
  if (!id || !name) { res.status(400).json({ error: "id y name requeridos" }); return; }

  const payload = {
    id, name,
    rif: rif || '',
    direccion: direccion || '',
    type: type || 'Otro',
    plan: plan || 'basico',
    city: city || '',
    manager: manager || '',
    zona_postal: zona_postal || '0000',
    estado: 'Activo',
    kpis: { ventasUSD: 0, ticketProm: 0, productos: 0, clientes: 0 },
    inventario: [],
    gastos: [],
    ventas: [],
    ventas_mes: [0,0,0,0,0,0,0,0,0,0,0,0],
    productos: [],
  };

  const { data, error } = await supabase
    .from("tenants")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

router.patch("/tenants/:id", async (req: Request, res: Response) => {
  const allowed = ['name','rif','direccion','type','plan','city','manager','estado','zona_postal','kpis','inventario','gastos','ventas','ventas_mes','productos'];
  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  if (Object.keys(update).length === 0) { res.status(400).json({ error: "Nada que actualizar" }); return; }
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("tenants")
    .update(update)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error || !data) { res.status(404).json({ error: "Tenant no encontrado" }); return; }
  res.json(data);
});

router.delete("/tenants/:id", async (req: Request, res: Response) => {
  const { error } = await supabase.from("tenants").delete().eq("id", req.params.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

/* ── Usuarios CRUD ──────────────────────────────────────── */

router.get("/usuarios", async (_req: Request, res: Response) => {
  const { data, error } = await supabase.from("usuarios").select("*").order("nombre");
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

router.post("/usuarios", async (req: Request, res: Response) => {
  const { nombre, whatsapp, usuario, clave, comercio, rol, vistas } = req.body;
  if (!nombre || !usuario) { res.status(400).json({ error: "nombre y usuario requeridos" }); return; }

  const payload = {
    nombre,
    whatsapp: whatsapp || '',
    usuario,
    clave: clave || '',
    comercio: comercio || '',
    rol: rol || 'Operador',
    estado: 'Activo',
    email: req.body.email || '',
    vistas: vistas || ['dashboard','pos','inventario'],
  };

  const { data, error } = await supabase.from("usuarios").insert(payload).select().single();
  if (error) {
    if (error.code === '23505') { res.status(409).json({ error: "Ese usuario ya existe" }); return; }
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

router.patch("/usuarios/:id", async (req: Request, res: Response) => {
  const allowed = ['nombre','whatsapp','usuario','clave','comercio','rol','estado','email','vistas'];
  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  if (Object.keys(update).length === 0) { res.status(400).json({ error: "Nada que actualizar" }); return; }
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("usuarios")
    .update(update)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error || !data) { res.status(404).json({ error: "Usuario no encontrado" }); return; }
  res.json(data);
});

router.delete("/usuarios/:id", async (req: Request, res: Response) => {
  const { error } = await supabase.from("usuarios").delete().eq("id", req.params.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

/* ── Global Config ──────────────────────────────────────── */

router.get("/global-config", async (_req: Request, res: Response) => {
  const { data, error } = await supabase.from("global_config").select("key, value");
  if (error) { res.status(500).json({ error: error.message }); return; }
  const config: Record<string, any> = {};
  for (const row of (data ?? [])) config[row.key] = Number(row.value);
  res.json(config);
});

router.patch("/global-config/:key", async (req: Request, res: Response) => {
  const { value } = req.body;
  if (value === undefined) { res.status(400).json({ error: "value requerido" }); return; }

  const { data, error } = await supabase
    .from("global_config")
    .upsert({ key: req.params.key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

export default router;
