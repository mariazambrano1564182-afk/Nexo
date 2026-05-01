/* =========================================================
   CONFIGURACIÓN Y CLIENTE SUPABASE
   Coloca tus credenciales en las variables de entorno o aquí.
   ========================================================= */
const SUPABASE_URL = typeof process !== 'undefined' && process.env?.SUPABASE_URL
  ? process.env.SUPABASE_URL
  : 'TU_URL_DE_SUPABASE';

const SUPABASE_ANON_KEY = typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY
  ? process.env.SUPABASE_ANON_KEY
  : 'TU_ANON_KEY_DE_SUPABASE';

const { createClient } = window.supabase || {};
const _supabase = createClient ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

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
    const { data: prod } = await _supabase
      .from('products')
      .select('stock')
      .eq('tenant_id', tenantId)
      .eq('name', it.nombre)
      .single();
    if (!prod) continue;
    const nuevoStock = Math.max(0, (prod.stock || 0) - it.qty);
    await _supabase
      .from('products')
      .update({ stock: nuevoStock })
      .eq('tenant_id', tenantId)
      .eq('name', it.nombre);
  }
}
