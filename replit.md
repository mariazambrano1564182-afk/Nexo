# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.
This is a multi-tenant ERP system called **Nexo Core V3** — a Spanish-language business management platform with POS, inventory, expenses, reporting, and user management.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: Supabase (PostgreSQL) — ALL data storage
- **Build**: esbuild (ESM bundle)
- **Frontend**: Vanilla HTML/CSS/JS served by the API server (`index.html` + `app.js`)
- **Realtime**: Supabase Realtime (subscribed to `global_config` table changes)

## Architecture

### Global State Provider (stateless)
The app is fully stateless. On every page load, `app.js` runs the **Global State Provider** which:
1. Runs idempotent migrations via `POST /api/migrate`
2. Loads the full STATE from the DB: BCV rate (`global_config`), tenants (comercios), users
3. Subscribes to Supabase Realtime on the `global_config` table — any change to `tasa_bcv` instantly re-renders all connected clients without manual intervention
4. Replaces `localStorage` entirely — `saveToStorage()` and `loadFromStorage()` are no-ops

### API Server (`artifacts/api-server`)
Express 5, TypeScript, built with esbuild, serves static files AND REST API:
- `GET/POST /api/tenants` — list/create comercios (aggregated with inventario, gastos, ventas)
- `GET/PATCH/DELETE /api/tenants/:id` — read/update/delete comercio
- `GET/POST /api/usuarios` — list/create usuarios
- `PATCH/DELETE /api/usuarios/:id` — update/delete usuario
- `GET /api/global-config` — get all config (tasa_bcv, etc.)
- `PATCH /api/global-config/:key` — update a config value (write-through to Supabase)
- `POST /api/migrate` — idempotent seed data (comercios, inventario, gastos, usuarios)
- `GET/POST /api/db/products` — products CRUD (maps to `inventario` table)
- `PUT/DELETE /api/db/products/:id` — update/delete product
- `POST /api/db/products/deduct-stock` — reduce stock after sale
- `GET/POST /api/db/sales` — sales CRUD (maps to `ventas` + `ventas_detalle`)
- `POST /api/auth/login` — authenticate via `usuarios` table (username + password_hash)
- `GET /api/config` — returns Supabase credentials to frontend

### Mockup sandbox (`artifacts/mockup-sandbox`)
Vite + React + shadcn/ui for component prototyping (separate server).

## Database — Supabase Tables (ONLY storage, local PG no longer used)

All data is stored in Supabase. Tables and their actual column names:

- **`comercios`** — id (UUID PK auto), nombre (NOT NULL), rif (NOT NULL), direccion, created_at
- **`inventario`** — id (UUID), comercio_id (UUID FK→comercios.id), codigo_barras, descripcion (NOT NULL), stock (num, default 0), costo, precio_venta, moneda (default 'USD'), categoria, last_update
- **`gastos`** — id (UUID), comercio_id (UUID FK), descripcion, monto_usd, categoria, fecha
- **`ventas`** — id (UUID), comercio_id (UUID FK), usuario_id, total_usd, total_bs, tasa_bcv, metodo_pago, fecha
- **`ventas_detalle`** — id (UUID), venta_id (UUID FK→ventas.id), producto_id, cantidad, precio_unitario_usd
- **`usuarios`** — id (UUID), comercio_id (UUID FK, nullable for admins), username (NOT NULL UNIQUE), password_hash (NOT NULL), rol (CHECK: admin|gerente|vendedor|farmaceutico), nombre_completo, created_at
- **`global_config`** — key (TEXT PK), value (NUMERIC), updated_at
- **`products`** — id, name, tenant_id (TEXT, legacy), sku, stock (legacy table, prefer `inventario`)
- **`sales`** — (legacy table, prefer `ventas` + `ventas_detalle`)

## Schema Mapping (API ↔ Supabase)

The API translates between the frontend's expected format and Supabase column names:

| Frontend field | Supabase column | Table |
|---|---|---|
| `name` | `nombre` | comercios |
| `sku` | `codigo_barras` | inventario |
| `nombre` (item) | `descripcion` | inventario |
| `costoUSD` | `costo` | inventario |
| `precioUSD` | `precio_venta` | inventario |
| `desc` | `descripcion` | gastos |
| `monto` | `monto_usd` | gastos |
| `bcv` | `tasa_bcv` | ventas |
| `metodoPago` | `metodo_pago` | ventas |
| `usuario` | `username` | usuarios |
| `clave` | `password_hash` | usuarios |
| `nombre` (user) | `nombre_completo` | usuarios |
| `comercio` | `comercio_id` | usuarios |
| `rol` display | `rol` DB (lowercase) | usuarios |

## Role Mapping

Frontend display roles → Supabase DB constraint values:
- "Super Admin" → "admin"
- "Gerente" → "gerente"
- "Vendedor" → "vendedor"
- "Farmacéutico" → "farmaceutico"

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Workflows

- **artifacts/api-server: API Server** (main preview): `pnpm --filter @workspace/api-server run dev` — serves the app (main preview port)
- **Nexo Core V3**: `PORT=5000 NODE_ENV=development pnpm --filter @workspace/api-server run dev` — secondary instance on port 5000
- **API Server**: `PORT=3001 pnpm --filter @workspace/api-server run dev` — tertiary instance on port 3001
- **Mockup Sandbox**: `PORT=3002 BASE_PATH=/ pnpm --filter @workspace/mockup-sandbox run dev` — UI component sandbox

## Authentication

Login uses `POST /api/auth/login` → queries Supabase `usuarios` table:
- Matches `username` field, compares `password_hash` field (plain text, no hashing currently)
- Default admin: `andres` / `nexo2026` (rol: admin → "Super Admin" in UI)
- The `comercio` field = `null` (stored as "all") → grants Super Admin access to all tenants

Sessions stored in `sessionStorage` only (cleared on tab close).

## Environment Secrets

- `SUPABASE_URL` — Supabase project REST URL (includes `/rest/v1/` suffix)
- `SUPABASE_ANON_KEY` — Supabase anon key (used for all DB operations including auth)
- `DATABASE_URL` — Replit built-in PostgreSQL (no longer used for data)
