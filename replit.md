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
- **Database**: PostgreSQL (Replit built-in) + Drizzle ORM connection pool
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Build**: esbuild (ESM bundle)
- **Frontend**: Vanilla HTML/CSS/JS served by the API server (`index.html` + `app.js`)
- **Realtime**: Supabase Realtime (subscribed to `global_config` table changes)

## Architecture

### Global State Provider (stateless)
The app is fully stateless. On every page load, `app.js` runs the **Global State Provider** which:
1. Runs idempotent migrations via `POST /api/migrate`
2. Loads the full STATE from the DB: BCV rate (`global_config`), tenants, users
3. Subscribes to Supabase Realtime on the `global_config` table — any change to `tasa_bcv` instantly re-renders all connected clients without manual intervention
4. Replaces `localStorage` entirely — `saveToStorage()` and `loadFromStorage()` are no-ops

### API Server (`artifacts/api-server`)
Express 5, TypeScript, built with esbuild, serves static files AND REST API:
- `GET/POST /api/tenants` — list/create tenants
- `GET/PATCH/DELETE /api/tenants/:id` — read/update/delete tenant
- `GET/POST /api/usuarios` — list/create users
- `PATCH/DELETE /api/usuarios/:id` — update/delete user
- `GET /api/global-config` — get all config (tasa_bcv, etc.)
- `PATCH /api/global-config/:key` — update a config value (write-through to DB + Supabase)
- `POST /api/migrate` — idempotent table creation + seed data
- `GET/POST /api/db/products` — products CRUD
- `GET/POST /api/db/sales` — sales CRUD
- `GET /api/config` — returns Supabase credentials to frontend

### Mockup sandbox (`artifacts/mockup-sandbox`)
Vite + React + shadcn/ui for component prototyping (separate server).

### DB lib (`lib/db`)
Drizzle ORM connection to Replit PostgreSQL.

## Database Tables (PostgreSQL — local Replit DB)

- `tenants` — id (TEXT PK), name, rif, direccion, type, plan, city, manager, estado, zona_postal, kpis (JSONB), inventario (JSONB), gastos (JSONB), ventas (JSONB), ventas_mes (JSONB), productos (JSONB), timestamps
- `usuarios` — id (SERIAL PK), nombre, whatsapp, usuario (UNIQUE), clave, comercio, rol, estado, email, vistas (JSONB), timestamps
- `global_config` — key (TEXT PK), value (NUMERIC), updated_at
- `products` — tenant_id, sku, name, stock, cost_usd, price_usd, currency, timestamps
- `sales` — tenant_id, items (JSONB), total_usd, total_bs, bcv, metodo_pago, created_at

## Supabase Tables (remote — for Realtime)

- `global_config` — key/value pairs (e.g. `tasa_bcv = 36.50`). Realtime is subscribed to this table.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Workflows

- **Nexo Core V3** (main): `PORT=5000 pnpm --filter @workspace/api-server run dev` — serves on port 5000 (maps to external port 80)
- **API Server**: `PORT=3001 pnpm --filter @workspace/api-server run dev` — secondary API on port 3001
- **Mockup Sandbox**: `PORT=3002 BASE_PATH=/ pnpm --filter @workspace/mockup-sandbox run dev` — UI component sandbox

## Authentication

The app uses a local credential system (no external auth required):
- `admin` / `nexo2026` — Super Admin role (access to all tenants and settings)
- `ferreteria` / `cliente123` — Client role (Ferretería El Centro only)

Sessions are stored in `sessionStorage` only (cleared on tab close).

## Environment Secrets

- `SUPABASE_URL` — Supabase project URL (required for Realtime)
- `SUPABASE_ANON_KEY` — Supabase anon key (required for Realtime)
- `DATABASE_URL` — Replit built-in PostgreSQL (auto-configured)
