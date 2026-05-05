/* =========================================================
   NEXO CORE V3 — Global State Provider
   Stateless: all config comes from DB (Supabase / local PG).
   Realtime subscriptions push live updates to all clients.
   ========================================================= */

let _supabase = null;
let _realtimeChannel = null;

/* ── Bootstrap ─────────────────────────────────────────── */

async function initGlobalStateProvider() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Config endpoint returned ' + res.status);
    const { supabaseUrl, supabaseAnonKey } = await res.json();
    const { createClient } = window.supabase || {};
    if (!createClient) throw new Error('supabase-js not loaded');
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[GSP] Supabase client ready');
  } catch (err) {
    console.warn('[GSP] Supabase init failed:', err.message, '— continuing without Realtime');
  }

  await runMigrations();
  await loadStateFromDB();
  subscribeRealtime();
}

/* ── Migrations (idempotent) ───────────────────────────── */

async function runMigrations() {
  try {
    const res = await fetch('/api/migrate', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Migration failed');
    console.log('[GSP] Migrations:', data.message);
  } catch (err) {
    console.error('[GSP] Migration error:', err.message);
  }
}

/* ── Load full state from DB ───────────────────────────── */

async function loadStateFromDB() {
  try {
    const [cfgRes, tenantsRes, usuariosRes] = await Promise.all([
      fetch('/api/global-config'),
      fetch('/api/tenants'),
      fetch('/api/usuarios'),
    ]);

    if (cfgRes.ok) {
      const cfg = await cfgRes.json();
      if (typeof cfg.tasa_bcv === 'number') {
        STATE.bcv = cfg.tasa_bcv;
        console.log('[GSP] BCV loaded from DB:', STATE.bcv);
      }
    }

    if (tenantsRes.ok) {
      const rows = await tenantsRes.json();
      if (Array.isArray(rows) && rows.length > 0) {
        STATE.tenants = {};
        for (const row of rows) {
          STATE.tenants[row.id] = dbRowToTenant(row);
        }
        if (!STATE.tenants[STATE.currentTenant]) {
          STATE.currentTenant = Object.keys(STATE.tenants)[0];
        }
        console.log('[GSP] Tenants loaded from DB:', Object.keys(STATE.tenants));
      }
    }

    if (usuariosRes.ok) {
      const rows = await usuariosRes.json();
      if (Array.isArray(rows)) {
        STATE.usuarios = rows.map(dbRowToUsuario);
        console.log('[GSP] Usuarios loaded from DB:', STATE.usuarios.length);
      }
    }

    rebuildTenantSwitcher();
    if (typeof render === 'function' && STATE.session) render();
  } catch (err) {
    console.error('[GSP] loadStateFromDB error:', err.message);
  }
}

/* ── DB row → STATE shape converters ───────────────────── */

function dbRowToTenant(row) {
  return {
    name:       row.name,
    rif:        row.rif        || '',
    direccion:  row.direccion  || '',
    type:       row.type       || 'Otro',
    plan:       row.plan       || 'basico',
    city:       row.city       || '',
    manager:    row.manager    || '',
    estado:     row.estado     || 'Activo',
    zonaPostal: row.zona_postal || '0000',
    kpis:       row.kpis       || { ventasUSD: 0, ticketProm: 0, productos: 0, clientes: 0 },
    inventario: Array.isArray(row.inventario) ? row.inventario : [],
    gastos:     Array.isArray(row.gastos)     ? row.gastos     : [],
    ventas:     Array.isArray(row.ventas)     ? row.ventas     : [],
    ventasMes:  Array.isArray(row.ventas_mes) ? row.ventas_mes : [0,0,0,0,0,0,0,0,0,0,0,0],
    productos:  Array.isArray(row.productos)  ? row.productos  : [],
    _dbId:      row.id,
  };
}

function dbRowToUsuario(row) {
  return {
    _dbId:    row.id,
    nombre:   row.nombre   || '',
    whatsapp: row.whatsapp || '',
    usuario:  row.usuario  || '',
    clave:    row.clave    || '',
    comercio: row.comercio || '',
    rol:      row.rol      || 'Operador',
    estado:   row.estado   || 'Activo',
    email:    row.email    || '',
    vistas:   Array.isArray(row.vistas) ? row.vistas : ['dashboard','pos','inventario'],
  };
}

/* ── Realtime subscriptions ─────────────────────────────── */

function subscribeRealtime() {
  if (!_supabase) return;

  if (_realtimeChannel) {
    _supabase.removeChannel(_realtimeChannel);
  }

  _realtimeChannel = _supabase
    .channel('nexo-core-v3-global')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table:  'global_config',
    }, handleGlobalConfigChange)
    .subscribe((status) => {
      console.log('[GSP] Realtime status:', status);
    });

  console.log('[GSP] Realtime subscriptions active');
}

function handleGlobalConfigChange(payload) {
  console.log('[GSP] global_config changed:', payload);
  const row = payload.new || payload.old;
  if (!row) return;

  if (row.key === 'tasa_bcv' && typeof row.value === 'number') {
    STATE.bcv = row.value;
    if (typeof render === 'function' && STATE.session) {
      render();
      if (typeof toast === 'function') {
        toast(`Tasa BCV actualizada en tiempo real: Bs ${row.value.toFixed(2)}`);
      }
    }
  }
}

/* ── Tenant CRUD (writes back to DB) ───────────────────── */

async function saveTenantToDB(tenantId) {
  const t = STATE.tenants[tenantId];
  if (!t) return;
  try {
    await fetch(`/api/tenants/${tenantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inventario: t.inventario,
        gastos:     t.gastos,
        ventas:     t.ventas,
        ventas_mes: t.ventasMes,
        productos:  t.productos,
        kpis:       t.kpis,
      }),
    });
  } catch (err) {
    console.error('[GSP] saveTenantToDB error:', err.message);
  }
}

async function createTenantInDB(id, data) {
  const res = await fetch('/api/tenants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Error al crear tenant');
  return await res.json();
}

async function updateTenantInDB(id, fields) {
  const res = await fetch(`/api/tenants/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Error al actualizar tenant');
  return await res.json();
}

async function deleteTenantFromDB(id) {
  const res = await fetch(`/api/tenants/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error((await res.json()).error || 'Error al eliminar tenant');
}

/* ── Usuario CRUD ──────────────────────────────────────── */

async function createUsuarioInDB(data) {
  const res = await fetch('/api/usuarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Error al crear usuario');
  return await res.json();
}

async function updateUsuarioInDB(dbId, fields) {
  const res = await fetch(`/api/usuarios/${dbId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Error al actualizar usuario');
  return await res.json();
}

async function deleteUsuarioFromDB(dbId) {
  const res = await fetch(`/api/usuarios/${dbId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error((await res.json()).error || 'Error al eliminar usuario');
}

/* ── BCV rate write-through ─────────────────────────────── */

async function updateBCVRate(newRate) {
  try {
    const { error } = await _supabase
      .from("global_config")
      .update({ value: newRate })
      .eq("key", "tasa_bcv");
    if (error) throw error;
    STATE.bcv = newRate;
    if (typeof render === "function") render();
    toast("✅ Tasa BCV sincronizada correctamente");
  } catch (err) {
    console.error("Error:", err.message);
    toast("❌ Error: " + err.message);
  }
}

/* ── Tenant switcher DOM sync ───────────────────────────── */

function rebuildTenantSwitcher() {
  const selects = document.querySelectorAll('#tenant-switcher');
  selects.forEach(sel => {
    const current = sel.value || STATE.currentTenant;
    sel.innerHTML = Object.entries(STATE.tenants)
      .map(([k, t]) => `<option value="${k}"${k === current ? ' selected' : ''}>${t.name}</option>`)
      .join('');
  });
}

/* ── Inventory / Sales write-through ───────────────────── */

async function registrarVentaSupabase(venta) {
  try {
    const res = await fetch('/api/db/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id:   venta.tenantKey,
        items:       venta.items,
        total_usd:   venta.totalUSD,
        total_bs:    venta.totalBS,
        bcv:         venta.bcv,
        metodo_pago: venta.metodoPago,
        created_at:  venta.fecha,
      }),
    });
    const data = await res.json();
    return res.ok ? { data, error: null } : { data: null, error: data };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

async function descontarStockSupabase(items, tenantId) {
  try {
    await fetch('/api/db/products/deduct-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, items }),
    });
  } catch (err) {
    console.error('[GSP] descontarStock:', err.message);
  }
}

/* ── Storage stubs (stateless — no-ops) ─────────────────── */

function saveToStorage() {}
function loadFromStorage() {}
function resetStorage() { location.reload(); }

/* ── Boot ───────────────────────────────────────────────── */

initGlobalStateProvider().then(() => {
  if (typeof render === 'function' && STATE.session) {
    render();
    console.log('[GSP] UI refreshed from DB state');
  }
});
