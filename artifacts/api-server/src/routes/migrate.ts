import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";

const router = Router();

/* ── Supabase REST helper ───────────────────────────────── */

function getSupabaseBase(): string {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

async function sbFetch(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: object
): Promise<{ ok: boolean; status: number; data: any }> {
  const base = getSupabaseBase();
  const key  = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!base || !key) {
    console.warn('[Supabase] SUPABASE_URL / SUPABASE_ANON_KEY no configurados');
    return { ok: false, status: 0, data: null };
  }
  try {
    const res = await fetch(`${base}/rest/v1/${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = text; }
    if (!res.ok) {
      console.warn(`[Supabase] ${method} ${path} → ${res.status}`, data);
    }
    return { ok: res.ok, status: res.status, data };
  } catch (e: any) {
    console.error('[Supabase] fetch error:', e.message);
    return { ok: false, status: 0, data: null };
  }
}

/* Supabase usuarios sync is intentionally disabled.
   The Supabase 'usuarios' table is an auth table with a different schema (password_hash, etc.)
   This app manages its own auth via local PostgreSQL.
   Supabase is only used here for Realtime on global_config. */
async function sbUpsertUsuario(_u: Record<string, any>) {
  return { ok: true, status: 200, data: null };
}

async function sbDeleteUsuario(_usuarioField: string) {
  return { ok: true, status: 200, data: null };
}

/* ── Seed data ──────────────────────────────────────────── */

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
      { fecha:'2026-04-22', categoria:'Alquiler',   desc:'Local comercial Abril',      monto:850,  moneda:'USD' },
      { fecha:'2026-04-23', categoria:'Servicios',  desc:'Electricidad CORPOELEC',     monto:1200, moneda:'BS'  },
      { fecha:'2026-04-25', categoria:'Logística',  desc:'Flete proveedor cemento',    monto:120,  moneda:'USD' },
      { fecha:'2026-04-27', categoria:'Nómina',     desc:'Quincena vendedores',        monto:640,  moneda:'USD' },
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
      { fecha:'2026-04-20', categoria:'Alquiler',  desc:'Local farmacia Abril',         monto:1400, moneda:'USD' },
      { fecha:'2026-04-22', categoria:'Servicios', desc:'Internet + telefonía',         monto:95,   moneda:'USD' },
      { fecha:'2026-04-24', categoria:'Compras',   desc:'Lote antibióticos',            monto:3200, moneda:'USD' },
      { fecha:'2026-04-26', categoria:'Nómina',    desc:'Quincena farmacéuticos',       monto:1800, moneda:'USD' },
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
  { nombre:'Carla Pérez',     whatsapp:'', usuario:'carla',  clave:'', comercio:'ferreteria', rol:'Vendedor',     estado:'Activo', email:'carla@nexo.io',  vistas:['dashboard','pos','inventario'] },
  { nombre:'María Rodríguez', whatsapp:'', usuario:'maria',  clave:'', comercio:'farmacia',   rol:'Gerente',      estado:'Activo', email:'maria@nexo.io',  vistas:['dashboard','pos','inventario','gastos','reportes'] },
  { nombre:'Daniel Torres',   whatsapp:'', usuario:'daniel', clave:'', comercio:'farmacia',   rol:'Farmacéutico', estado:'Activo', email:'daniel@nexo.io', vistas:['dashboard','pos','inventario'] },
  { nombre:'Andrés Vega',     whatsapp:'', usuario:'andres', clave:'', comercio:'all',        rol:'Super Admin',  estado:'Activo', email:'andres@nexo.io', vistas:['dashboard','pos','inventario','gastos','reportes','usuarios','configuracion','infraestructura'] },
];

/* ── Migration endpoint ─────────────────────────────────── */

router.post("/migrate", async (_req: Request, res: Response) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        rif TEXT NOT NULL DEFAULT '',
        direccion TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL DEFAULT 'Otro',
        plan TEXT NOT NULL DEFAULT 'basico',
        city TEXT NOT NULL DEFAULT '',
        manager TEXT NOT NULL DEFAULT '',
        estado TEXT NOT NULL DEFAULT 'Activo',
        zona_postal TEXT NOT NULL DEFAULT '0000',
        kpis JSONB NOT NULL DEFAULT '{"ventasUSD":0,"ticketProm":0,"productos":0,"clientes":0}'::jsonb,
        inventario JSONB NOT NULL DEFAULT '[]'::jsonb,
        gastos JSONB NOT NULL DEFAULT '[]'::jsonb,
        ventas JSONB NOT NULL DEFAULT '[]'::jsonb,
        ventas_mes JSONB NOT NULL DEFAULT '[0,0,0,0,0,0,0,0,0,0,0,0]'::jsonb,
        productos JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        whatsapp TEXT NOT NULL DEFAULT '',
        usuario TEXT NOT NULL UNIQUE,
        clave TEXT NOT NULL DEFAULT '',
        comercio TEXT NOT NULL DEFAULT '',
        rol TEXT NOT NULL DEFAULT 'Operador',
        estado TEXT NOT NULL DEFAULT 'Activo',
        email TEXT NOT NULL DEFAULT '',
        vistas JSONB NOT NULL DEFAULT '["dashboard","pos","inventario"]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS global_config (
        key TEXT PRIMARY KEY,
        value NUMERIC NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      INSERT INTO global_config (key, value) VALUES ('tasa_bcv', 36.50)
      ON CONFLICT (key) DO NOTHING
    `);

    const { rows: existingTenants } = await pool.query("SELECT id FROM tenants LIMIT 1");
    if (existingTenants.length === 0) {
      for (const t of SEED_TENANTS) {
        await pool.query(
          `INSERT INTO tenants (id, name, rif, direccion, type, plan, city, manager, estado, zona_postal, kpis, inventario, gastos, ventas, ventas_mes, productos)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           ON CONFLICT (id) DO NOTHING`,
          [
            t.id, t.name, t.rif, t.direccion, t.type, t.plan,
            t.city, t.manager, t.estado, t.zona_postal,
            JSON.stringify(t.kpis),
            JSON.stringify(t.inventario),
            JSON.stringify(t.gastos),
            JSON.stringify(t.ventas),
            JSON.stringify(t.ventas_mes),
            JSON.stringify(t.productos),
          ]
        );
      }
    }

    const { rows: existingUsers } = await pool.query("SELECT id FROM usuarios LIMIT 1");
    if (existingUsers.length === 0) {
      for (const u of SEED_USUARIOS) {
        await pool.query(
          `INSERT INTO usuarios (nombre, whatsapp, usuario, clave, comercio, rol, estado, email, vistas)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (usuario) DO NOTHING`,
          [u.nombre, u.whatsapp, u.usuario, u.clave, u.comercio, u.rol, u.estado, u.email, JSON.stringify(u.vistas)]
        );
      }
    }

    res.json({ ok: true, message: "Migración completada" });
  } catch (err: any) {
    console.error("[migrate]", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── Tenants CRUD ───────────────────────────────────────── */

router.get("/tenants", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query("SELECT * FROM tenants ORDER BY name");
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/tenants/:id", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query("SELECT * FROM tenants WHERE id=$1", [req.params.id]);
    if (!rows[0]) { res.status(404).json({ error: "Tenant no encontrado" }); return; }
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/tenants", async (req: Request, res: Response) => {
  try {
    const { id, name, rif, direccion, type, plan, city, manager, zona_postal } = req.body;
    if (!id || !name) { res.status(400).json({ error: "id y name requeridos" }); return; }
    const { rows } = await pool.query(
      `INSERT INTO tenants (id, name, rif, direccion, type, plan, city, manager, zona_postal)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         name=$2, rif=$3, direccion=$4, type=$5, plan=$6, city=$7, manager=$8, zona_postal=$9, updated_at=NOW()
       RETURNING *`,
      [id, name, rif||'', direccion||'', type||'Otro', plan||'basico', city||'', manager||'', zona_postal||'0000']
    );
    res.status(201).json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/tenants/:id", async (req: Request, res: Response) => {
  try {
    const allowed = ['name','rif','direccion','type','plan','city','manager','estado','zona_postal','kpis','inventario','gastos','ventas','ventas_mes','productos'];
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        sets.push(`${key}=$${idx++}`);
        vals.push(typeof req.body[key] === 'object' ? JSON.stringify(req.body[key]) : req.body[key]);
      }
    }
    if (sets.length === 0) { res.status(400).json({ error: "Nada que actualizar" }); return; }
    sets.push(`updated_at=NOW()`);
    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE tenants SET ${sets.join(',')} WHERE id=$${idx} RETURNING *`,
      vals
    );
    if (!rows[0]) { res.status(404).json({ error: "Tenant no encontrado" }); return; }
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/tenants/:id", async (req: Request, res: Response) => {
  try {
    await pool.query("DELETE FROM tenants WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Usuarios CRUD ──────────────────────────────────────── */

router.get("/usuarios", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query("SELECT * FROM usuarios ORDER BY nombre");
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/usuarios", async (req: Request, res: Response) => {
  try {
    const { nombre, whatsapp, usuario, clave, comercio, rol, vistas } = req.body;
    if (!nombre || !usuario) { res.status(400).json({ error: "nombre y usuario requeridos" }); return; }
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, whatsapp, usuario, clave, comercio, rol, vistas)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [nombre, whatsapp||'', usuario, clave||'', comercio||'', rol||'Operador', JSON.stringify(vistas||['dashboard','pos','inventario'])]
    );
    const created = rows[0];
    const sb = await sbUpsertUsuario(created);
    console.log(`[Supabase] usuario creado "${usuario}":`, sb.status, sb.ok ? 'OK' : sb.data);
    res.status(201).json(created);
  } catch (err: any) {
    if (err.code === '23505') { res.status(409).json({ error: "Ese usuario ya existe" }); return; }
    res.status(500).json({ error: err.message });
  }
});

router.patch("/usuarios/:id", async (req: Request, res: Response) => {
  try {
    const allowed = ['nombre','whatsapp','usuario','clave','comercio','rol','estado','email','vistas'];
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        sets.push(`${key}=$${idx++}`);
        vals.push(typeof req.body[key] === 'object' ? JSON.stringify(req.body[key]) : req.body[key]);
      }
    }
    if (sets.length === 0) { res.status(400).json({ error: "Nada que actualizar" }); return; }
    sets.push(`updated_at=NOW()`);
    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE usuarios SET ${sets.join(',')} WHERE id=$${idx} RETURNING *`,
      vals
    );
    if (!rows[0]) { res.status(404).json({ error: "Usuario no encontrado" }); return; }
    const updated = rows[0];
    const sb = await sbUpsertUsuario(updated);
    console.log(`[Supabase] usuario actualizado "${updated.usuario}":`, sb.status, sb.ok ? 'OK' : sb.data);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/usuarios/:id", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query("DELETE FROM usuarios WHERE id=$1 RETURNING usuario", [req.params.id]);
    if (rows[0]?.usuario) {
      const sb = await sbDeleteUsuario(rows[0].usuario);
      console.log(`[Supabase] usuario eliminado "${rows[0].usuario}":`, sb.status, sb.ok ? 'OK' : sb.data);
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Sync local → Supabase ──────────────────────────────── */

router.post("/sync-supabase", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query("SELECT * FROM usuarios ORDER BY id");
    const results: { usuario: string; status: number; ok: boolean }[] = [];
    for (const u of rows) {
      const sb = await sbUpsertUsuario(u);
      results.push({ usuario: u.usuario, status: sb.status, ok: sb.ok });
      console.log(`[Supabase sync] "${u.usuario}" → ${sb.status}`, sb.ok ? 'OK' : sb.data);
    }
    const ok    = results.filter(r => r.ok).length;
    const error = results.filter(r => !r.ok).length;
    res.json({ synced: ok, errors: error, detail: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Global Config ──────────────────────────────────────── */

router.get("/global-config", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query("SELECT key, value FROM global_config");
    const config: Record<string, any> = {};
    for (const row of rows) config[row.key] = Number(row.value);
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/global-config/:key", async (req: Request, res: Response) => {
  try {
    const { value } = req.body;
    if (value === undefined) { res.status(400).json({ error: "value requerido" }); return; }
    const { rows } = await pool.query(
      `INSERT INTO global_config (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()
       RETURNING *`,
      [req.params.key, value]
    );
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
