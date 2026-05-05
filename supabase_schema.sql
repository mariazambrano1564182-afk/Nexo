-- ============================================================
-- Nexo Core V3 — Supabase Schema (completo)
-- Ejecuta esto en tu proyecto Supabase:
--   Dashboard → SQL Editor → New query → pegar y ejecutar
-- ============================================================

-- Tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  rif         text NOT NULL DEFAULT '',
  direccion   text NOT NULL DEFAULT '',
  type        text NOT NULL DEFAULT 'Otro',
  plan        text NOT NULL DEFAULT 'basico',
  city        text NOT NULL DEFAULT '',
  manager     text NOT NULL DEFAULT '',
  estado      text NOT NULL DEFAULT 'Activo',
  zona_postal text NOT NULL DEFAULT '0000',
  kpis        jsonb NOT NULL DEFAULT '{"ventasUSD":0,"ticketProm":0,"productos":0,"clientes":0}'::jsonb,
  inventario  jsonb NOT NULL DEFAULT '[]'::jsonb,
  gastos      jsonb NOT NULL DEFAULT '[]'::jsonb,
  ventas      jsonb NOT NULL DEFAULT '[]'::jsonb,
  ventas_mes  jsonb NOT NULL DEFAULT '[0,0,0,0,0,0,0,0,0,0,0,0]'::jsonb,
  productos   jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Usuarios table
CREATE TABLE IF NOT EXISTS public.usuarios (
  id         bigserial PRIMARY KEY,
  nombre     text NOT NULL,
  whatsapp   text NOT NULL DEFAULT '',
  usuario    text NOT NULL UNIQUE,
  clave      text NOT NULL DEFAULT '',
  comercio   text NOT NULL DEFAULT '',
  rol        text NOT NULL DEFAULT 'Operador',
  estado     text NOT NULL DEFAULT 'Activo',
  email      text NOT NULL DEFAULT '',
  vistas     jsonb NOT NULL DEFAULT '["dashboard","pos","inventario"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Global config table
CREATE TABLE IF NOT EXISTS public.global_config (
  key        text PRIMARY KEY,
  value      numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Products table (inventory)
CREATE TABLE IF NOT EXISTS public.products (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   text NOT NULL,
  sku         text,
  name        text NOT NULL,
  stock       integer NOT NULL DEFAULT 0,
  price_usd   numeric(12, 2) NOT NULL DEFAULT 0,
  cost_usd    numeric(12, 2) NOT NULL DEFAULT 0,
  currency    text NOT NULL DEFAULT 'USD',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Sales table
CREATE TABLE IF NOT EXISTS public.sales (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   text NOT NULL,
  items       jsonb NOT NULL DEFAULT '[]',
  total_usd   numeric(12, 2) NOT NULL DEFAULT 0,
  total_bs    numeric(14, 2) NOT NULL DEFAULT 0,
  bcv         numeric(10, 4) NOT NULL DEFAULT 0,
  metodo_pago text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS products_tenant_idx ON public.products (tenant_id);
CREATE INDEX IF NOT EXISTS products_name_tenant_idx ON public.products (tenant_id, name);
CREATE INDEX IF NOT EXISTS sales_tenant_idx ON public.sales (tenant_id);
CREATE INDEX IF NOT EXISTS sales_created_at_idx ON public.sales (created_at DESC);
CREATE INDEX IF NOT EXISTS usuarios_usuario_idx ON public.usuarios (usuario);

-- Enable Row Level Security
ALTER TABLE public.tenants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales        ENABLE ROW LEVEL SECURITY;

-- Policies: allow all operations with anon key
CREATE POLICY IF NOT EXISTS "Allow all on tenants"       ON public.tenants       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all on usuarios"      ON public.usuarios      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all on global_config" ON public.global_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all on products"      ON public.products      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all on sales"         ON public.sales         FOR ALL USING (true) WITH CHECK (true);
