-- ============================================================
-- Nexo Core V3 — Supabase Schema
-- Run this in your Supabase project:
--   Dashboard → SQL Editor → New query → paste and run
-- ============================================================

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

CREATE INDEX IF NOT EXISTS products_tenant_idx ON public.products (tenant_id);
CREATE INDEX IF NOT EXISTS products_name_tenant_idx ON public.products (tenant_id, name);

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

CREATE INDEX IF NOT EXISTS sales_tenant_idx ON public.sales (tenant_id);
CREATE INDEX IF NOT EXISTS sales_created_at_idx ON public.sales (created_at DESC);

-- Enable Row Level Security (allow all for now with anon key)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Policies: allow all operations from anon key (adjust per your auth needs)
CREATE POLICY "Allow all on products" ON public.products
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on sales" ON public.sales
  FOR ALL USING (true) WITH CHECK (true);
