# GamerZone

## 1. Objective

Gaming e-commerce app: browse games → cart → checkout → mock payment → personal library. Real purpose: generate genuine transactional data through real users (friends), feeding a downstream DE pipeline (Section 13). Do not add synthetic purchase-data generation unless explicitly requested.

## 2. Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind → deployed on Vercel
- **Backend/DB:** Supabase (PostgreSQL + Auth)
- **Catalogue source:** IGDB API, via Twitch OAuth
- **Catalogue ingestion:** Python (`gamerzone-de-jobs`)
- **Planned:** Snowflake (lake/warehouse) + dbt (transforms) — not yet architected, see Section 13
- **Source control:** GitHub

## 3. Architecture

```text
IGDB → Python ingestion (gamerzone-de-jobs) → Supabase PostgreSQL → Next.js
  → User → Cart → Checkout → Mock Payment → Orders + Order Items + Payments
```

Supabase Auth is the only identity system: `auth.users` ↔ `public.users` (`public.users.user_id → auth.users.id`). Never introduce a second auth system.

**Rendering:** `page.tsx` (home), `games/[id]/page.tsx`, and `deals/page.tsx` are Server Components that query Supabase directly and each set `export const dynamic = "force-dynamic"`. Required because catalogue/price data changes via an external Python job Next.js has no revalidation hook for — without this, Next.js statically caches the page (and the underlying Supabase `fetch()` calls) and serves stale prices/catalogue indefinitely. Any new Server Component reading `games`/`consoles`/`game_prices` needs the same export.

## 4. Database

- **Catalogue:** `games`, `consoles`, `game_consoles`, `game_prices`
- **Users:** `users`
- **Purchases:** `orders` → `order_items`, `payments`

```text
auth.users → public.users → orders → order_items, payments
games → game_consoles → consoles
game_consoles → game_prices
game_consoles → order_items
```

`order_items` holds game/console/quantity/unit price. `payments` holds mock method, status, amount, transaction ref.

**Supabase embed convention:** `game_prices` and `order_items` have a composite FK into `game_consoles(game_id, console_id)` — **not** direct FKs into `games`/`consoles`. Any embedded select off either table must route through `game_consoles` (e.g. `game_prices → game_consoles → games, consoles`), or PostgREST returns `PGRST200`.

Before any schema change: inspect current schema/FKs, check dependent code, discuss destructive changes first. Be extra careful with `auth.users`, `public.users`, `orders`, `order_items`, `payments`.

**Schema versioning:** the full schema lives in `CLAUDE_CURRENT_DB_STATE.sql` (repo root) — a drop-and-recreate reset script, run manually in the Supabase SQL editor. Not Supabase-CLI-managed migrations (no `supabase/migrations`); this is a plain versioned SQL file, chosen over CLI setup since a full dev reset (not incremental ALTERs) is what's actually needed right now. Update this file whenever the schema changes, so it stays the source of truth.

**`updated_at`:** every table has a `set_updated_at()` trigger (`BEFORE UPDATE`, DB-owned) so `updated_at` is always correct regardless of which process writes the row — the Python ingestion job never sets it manually. This was a real bug (upserts changed `price` but left `updated_at` stale) fixed at the Postgres layer, not in application code.

**FKs:** `game_prices`/`order_items` use a single **composite** FK into `game_consoles(game_id, console_id)` (matches its composite PK) — not two separate single-column FKs, which is invalid since neither column is unique alone on `game_consoles`.

**RLS:** enabled on all 8 tables. Catalogue tables (`games`, `consoles`, `game_consoles`, `game_prices`) are public read-only (ingestion writes via `sb_secret_*` service key, which bypasses RLS). `users`/`orders`/`order_items`/`payments` are scoped to `auth.uid() = user_id` (directly, or via the owning `order` for child tables) — SELECT + INSERT only, no UPDATE/DELETE policies since the app never does either client-side.

## 5. Purchase Flow

Game Details → Add to Cart/Buy Now → Cart → Checkout → Mock Payment → Order + Order Items + Payment created → Success → Cart cleared.

Payment is intentionally mocked (types: `UPI`, `CARD`, `NET_BANKING`, `WALLET`) — no real gateway unless explicitly requested. Cart itself is client-side React Context only; Supabase is the source of truth once checkout succeeds.

## 6. Design System

- **Palette:** void `#0a0a14` (page bg), panel `#13131f` (cards), panel-hover `#191928`, header `#0d0d1a`, primary accent violet `#7c5cff` (hover `#6a45ff`, link text `#9b8cff`/hover `#c4b5ff`), secondary accent cyan `#34e6c8` (used specifically for prices/success states, not interchangeable with violet). Text: primary `#f4f3fa`, muted `#8a8aa3`, faint `#6b6b85`.
- **Type:** Geist Sans (UI/body), Geist Mono (already loaded, available for numeric/data), Space Grotesk as the display face for headings (`font-[family-name:var(--font-display)]`).
- **Cursor:** `app/components/CursorFX.tsx`, mounted once in `layout.tsx`, gives a custom dot+ring cursor that reacts to interactive elements. Only activates for fine-pointer devices and skips entirely under `prefers-reduced-motion`. All clickable elements should carry `cursor-pointer` explicitly (Tailwind v4 preflight does not default this on `<button>`).
- These are established choices — new pages/components should reuse these values rather than reintroducing the old `blue-400`/`blue-600`/`#05070d` palette.

## 7. Established Decisions

- Mock payments only — goal is realistic Supabase data, not real money.
- Purchase data must come from real UI use, not synthetic generation.
- Platform scope locked to IGDB platform IDs **6 (PC), 12 (Xbox 360), 41 (Wii U), 48 (PS4), 167 (PS5)** — don't expand without discussion.
- Preserve existing auth/cart/schema; extend rather than redesign; minimal dependencies.

## 8. Environment Variables

Never hardcode Supabase secrets, API keys, Twitch secrets, or DB credentials. Only expose vars to the browser when intentionally public.

## 9. Deployment

GitHub → Vercel. Vercel env vars are configured separately from local `.env`. Past incident: misconfigured `SUPABASE_PROJECT_URL` on Vercel → `getaddrinfo ENOTFOUND`. When debugging deploys, check Vercel env vars/values before assuming code is broken.

## 10. Development Style

Small, focused changes. Reuse existing components. Clear TypeScript types. Straightforward Supabase queries. Explicit error handling. Avoid premature abstraction.

## 11. Documentation

`CLAUDE.md` = current project knowledge/decisions. `PROGRESS.md` = milestone history. Don't duplicate history into CLAUDE.md; update CLAUDE.md when architecture changes, append PROGRESS.md when a milestone lands.

## 12. Current State

App is fully functional end-to-end: catalogue, auth, cart, checkout, mock payment, and the **Games Library** (`app/library/page.tsx` — purchased games by user, sourced from `order_items`/`orders` filtered on `user_id` + status `CONFIRMED`/`COMPLETED`, joined to `games`/`consoles`; handles signed-out/empty states). `CartItem` (in `CartContext.tsx`) carries both `consoleId` (for DB inserts) and `consoleName` (for display) — cart/checkout show the human-readable console name, never the raw ID. No known pending app-layer feature. Active work: the DE pipeline below.

## 13. Data Engineering Pipeline (Planned — Not Yet Architected)

```text
Supabase (Postgres, source) → daily ingestion → Snowflake (lake) → dbt models → analytics
```

**Decided:**
- Source: Supabase Postgres (read-only — never touch/modify the source system).
- Target: Snowflake (landing/raw zone + warehouse); S3 would be preferred but isn't available for free, so Snowflake plays both roles. Account already exists (warehouse/database setup still to do).
- Transform layer: dbt, building both dimension and fact models (explicit goal: SQL/dbt skill-building, so prefer the more realistic pattern over the shortcut).
- Extraction method: Python script (same pattern as `gamerzone-de-jobs`), read-only `SELECT`s, no CDC/logical replication (would require source-side changes).
- `orders`, `order_items`, `payments` are **insert-only** (confirmed via schema — `created_at`/`updated_at` always identical) → incremental load by PK watermark.
- `games`, `consoles`, `game_prices` are upserted by the IGDB job → full re-extract each run.
- `users` → full re-extract (cheap; guards against future profile-edit updates).
- Landing pattern: `RAW` schema in Snowflake, one table per source table, **append-only with `_loaded_at`** (not truncate-overwrite) — enables dbt staging dedup + optional `dbt snapshot`/SCD2 practice on `games`/`game_prices`.
- Load mechanism: Python → Snowflake directly (e.g. `snowflake-connector-python` `write_pandas`), no S3/external stage needed.
- Orchestration: GitHub Actions scheduled workflow (`cron`), daily — free, no new infra, fits existing GitHub-based workflow. Not Airflow/Prefect/Dagster — disproportionate for current scope.
- IGDB → Supabase catalogue job (`igdb_to_supabase_job.py`) moves from one-time manual run to a **scheduled job, 2x/week**, also via GitHub Actions.

**Open (discuss before implementing):**
- Snowflake warehouse/database/schema naming and setup.
- dbt project structure (staging/intermediate/marts layout, naming conventions).
- Exact dim/fact model design (grain of `fact_orders` vs `fact_order_items`, which dims are needed).

Implementation not yet started — paused in favor of frontend UI work (see PROGRESS.md).
