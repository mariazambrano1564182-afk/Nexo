/* =========================================================
   CONFIGURACIÓN Y CLIENTE SUPABASE
   Las credenciales se obtienen del servidor para no exponerlas
   en el código fuente del navegador.
   ========================================================= */
let _supabase = null;

async function initSupabase() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Config endpoint returned ' + res.status);
    const { supabaseUrl, supabaseAnonKey } = await res.json();
    const { createClient } = window.supabase || {};
    if (!createClient) throw new Error('supabase-js no cargado');
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[Supabase] Cliente inicializado correctamente');
  } catch (err) {
    console.warn('[Supabase] No se pudo inicializar:', err.message);
  }
}

/* =========================================================
   AUTENTICACIÓN SUPABASE (complementa el sistema local)
   ========================================================= */
async function supabaseLogin(email, password) {
  if (!_supabase) return { error: { message: 'Supabase no configurado' } };
  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

async function supabaseLogout() {
  if (!_supabase) return;
  await _supabase.auth.signOut();
}

/* =========================================================
   SINCRONIZACIÓN DE INVENTARIO — API propia del servidor
   ========================================================= */
async function syncInventarioFromSupabase(tenantId) {
  try {
    const res = await fetch(`/api/db/products?tenant_id=${encodeURIComponent(tenantId)}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (err) {
    console.error('syncInventario:', err.message);
    return null;
  }
}

async function syncVentasFromSupabase(tenantId) {
  try {
    const res = await fetch(`/api/db/sales?tenant_id=${encodeURIComponent(tenantId)}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (err) {
    console.error('syncVentas:', err.message);
    return null;
  }
}

/* =========================================================
   REGISTRO DE VENTA
   ========================================================= */
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

/* =========================================================
   DESCUENTO DE STOCK
   ========================================================= */
async function descontarStockSupabase(items, tenantId) {
  try {
    await fetch('/api/db/products/deduct-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, items }),
    });
  } catch (err) {
    console.error('descontarStock:', err.message);
  }
}

/* =========================================================
   SINCRONIZACIÓN INICIAL AL CARGAR LA APP
   ========================================================= */
async function syncAllTenantsFromSupabase() {
  if (typeof STATE === 'undefined') return;

  for (const tenantId of Object.keys(STATE.tenants)) {
    const productos = await syncInventarioFromSupabase(tenantId);
    if (productos && productos.length > 0) {
      const inventario = productos.map(p => ({
        sku:       p.sku || p.id || '',
        nombre:    p.name || p.nombre || '',
        stock:     p.stock || 0,
        costoUSD:  p.cost_usd || p.costoUSD || 0,
        precioUSD: p.price_usd || p.precioUSD || 0,
        moneda:    p.currency || p.moneda || 'USD',
      }));
      STATE.tenants[tenantId].inventario = inventario;
      STATE.tenants[tenantId].productos  = inventario.map(p => ({
        nombre: p.nombre,
        precio: p.precioUSD,
      }));
    }

    const ventas = await syncVentasFromSupabase(tenantId);
    if (ventas && ventas.length > 0) {
      STATE.tenants[tenantId].ventas = ventas.map(v => ({
        id:         v.id,
        fecha:      v.created_at,
        tenantKey:  v.tenant_id,
        tenantName: STATE.tenants[tenantId]?.name || v.tenant_id,
        items:      v.items || [],
        totalUSD:   v.total_usd || 0,
        totalBS:    v.total_bs || 0,
        bcv:        v.bcv || 0,
        metodoPago: v.metodo_pago || '',
      }));
    }
  }

  if (typeof saveToStorage === 'function') saveToStorage();
  if (typeof render === 'function') render();
  console.log('[DB] Sincronización inicial completada');
}

/* =========================================================
   ARRANQUE
   ========================================================= */
initSupabase().then(() => {
  syncAllTenantsFromSupabase();
});
