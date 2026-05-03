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
- **Database**: PostgreSQL + Drizzle ORM (Replit built-in PostgreSQL)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **Frontend**: Vanilla HTML/CSS/JS served by the API server (index.html + app.js)

## Architecture

- **API server** (`artifacts/api-server`): Express 5, TypeScript, built with esbuild, serves static files AND REST API
- **Mockup sandbox** (`artifacts/mockup-sandbox`): Vite + React + shadcn/ui for component prototyping
- **DB lib** (`lib/db`): Drizzle ORM schema definitions and connection
- **API spec** (`lib/api-spec`): OpenAPI spec + Orval codegen
- **API client** (`lib/api-client-react`, `lib/api-zod`): Generated typed API hooks and Zod schemas

## Database Tables (PostgreSQL)

- `products` — tenant_id, sku, name, stock, cost_usd, price_usd, currency, created_at, updated_at
- `sales` — tenant_id, items (JSONB), total_usd, total_bs, bcv, metodo_pago, created_at

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Workflows

- **Nexo Core V3** (main): `PORT=5000 pnpm --filter @workspace/api-server run dev` — serves on port 5000 (mapped to external port 80)
- **API Server**: `PORT=3001 pnpm --filter @workspace/api-server run dev` — secondary API on port 3001
- **Mockup Sandbox**: `PORT=3002 BASE_PATH=/ pnpm --filter @workspace/mockup-sandbox run dev` — UI component sandbox

## Authentication

The app uses a local credential system (no external auth required):
- `admin` / `nexo2026` — Super Admin role (access to all tenants and settings)
- `ferreteria` / `cliente123` — Client role (Ferretería El Centro only)

## External Integrations

- **Supabase** (optional): Used for optional data sync. The app works fully without `SUPABASE_URL` and `SUPABASE_ANON_KEY`. If you want to enable Supabase sync, add these as secrets.
- **DATABASE_URL**: Provided by Replit's built-in PostgreSQL — already configured.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
