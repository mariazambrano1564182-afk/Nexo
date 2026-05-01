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
   SINCRONIZACIÓN DE INVENTARIO CON SUPABASE
   ========================================================= */
async function syncInventarioFromSupabase(tenantId) {
  if (!_supabase) return null;
  const { data, error } = await _supabase
    .from('products')
    .select('*')
    .eq('tenant_id', tenantId);
  if (error) { console.error('syncInventario:', error.message); return null; }
  return data;
}

async function syncVentasFromSupabase(tenantId) {
  if (!_supabase) return null;
  const { data, error } = await _supabase
    .from('sales')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) { console.error('syncVentas:', error.message); return null; }
  return data;
}

/* =========================================================
   REGISTRO DE VENTA EN SUPABASE
   ========================================================= */
async function registrarVentaSupabase(venta) {
  if (!_supabase) return { error: { message: 'Supabase no configurado' } };
  const payload = {
    tenant_id:   venta.tenantKey,
    items:       venta.items,
    total_usd:   venta.totalUSD,
    total_bs:    venta.totalBS,
    bcv:         venta.bcv,
    metodo_pago: venta.metodoPago,
    created_at:  venta.fecha,
  };
  const { data, error } = await _supabase.from('sales').insert([payload]).select();
  return { data, error };
}

/* =========================================================
   DESCUENTO DE STOCK EN SUPABASE
   ========================================================= */
async function descontarStockSupabase(items, tenantId) {
  if (!_supabase) return;
  for (const it of items) {
    let query = _supabase.from('products').select('id, stock').eq('tenant_id', tenantId);
    if (it.sku) {
      query = query.eq('sku', it.sku);
    } else {
      query = query.eq('name', it.nombre);
    }
    const { data: rows } = await query.limit(1);
    const prod = rows && rows[0];
    if (!prod) continue;
    const nuevoStock = Math.max(0, (prod.stock || 0) - it.qty);
    await _supabase
      .from('products')
      .update({ stock: nuevoStock, updated_at: new Date().toISOString() })
      .eq('id', prod.id);
  }
}

/* =========================================================
   SINCRONIZACIÓN INICIAL AL CARGAR LA APP
   Se ejecuta después de que la UI haya iniciado.
   ========================================================= */
async function syncAllTenantsFromSupabase() {
  if (!_supabase) return;
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
      STATE.tenants[tenantId].productos = inventario.map(p => ({
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
  console.log('[Supabase] Sincronización inicial completada');
}

/* =========================================================
   ARRANQUE: inicializar Supabase y sincronizar datos
   ========================================================= */
initSupabase().then(() => {
  syncAllTenantsFromSupabase();
});
