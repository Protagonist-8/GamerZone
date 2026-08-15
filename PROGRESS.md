# GamerZone — Project Progress

> Note: Milestones below are organized by theme/order of implementation rather than exact calendar dates, since precise historical dates weren't tracked in the original log. Ask Claude to backfill real dates from `git log` if that's wanted.

## Project Foundation

- Created GamerZone gaming e-commerce application.
- Established Next.js frontend.
- Connected application to Supabase.
- Established PostgreSQL database for catalogue and transactional data.
- Created GitHub repository and pushed the project.
- Set up Vercel deployment.

## Game Catalogue Ingestion

- Integrated IGDB as the external game data source.
- Added Twitch OAuth for IGDB authentication.
- Created Python ingestion process (`gamerzone-de-jobs`).
- Limited initial platform scope to PC, Xbox, Nintendo, PlayStation.
- Loaded games, consoles, and game-console relationships into Supabase.
- Generated and loaded mock prices for game-console combinations.

## Database

Established major tables: `games`, `consoles`, `game_consoles`, `game_prices`, `users`, `orders`, `order_items`, `payments`.

Authentication relationship: `auth.users` → `public.users` → `orders`, via `public.users.user_id` referencing `auth.users.id`.

## Authentication

- Implemented Supabase Authentication (sign-up/sign-in).
- Authentication required before purchase actions.
- Resolved an initial email rate-limit issue during development.
- Reset authentication data during schema restructuring when necessary.

## Cart

Implemented: Add to Cart, Buy Now, Remove from Cart, Clear Cart, View Cart, cart total, console info per cart item. Managed via React Context (client-side only). Cart items store both `consoleId` (for order inserts) and `consoleName` (for display) so the UI never shows a raw numeric ID to the user.

## Checkout

Implemented: checkout page, mock payment options, mock successful payment flow, order creation, order item creation, payment record creation, successful-checkout page, cart clearing after purchase. No real payment API required — the mock flow exists so real users/friends can generate genuine purchase data.

## Home Page

Implemented: GamerZone header, authentication controls, game catalogue, game cards (image, release year, platform info, lowest available price), navigation to game details.

## Game Details

Implemented: game info, image, release year, description, available platforms, platform pricing, Buy Now, Add to Cart, view cart after adding an item.

## User Games Library

Implemented `app/library/page.tsx`:
- Identifies the current authenticated user.
- Retrieves their `order_items` joined to `orders`, filtered by `user_id` and status (`CONFIRMED`/`COMPLETED`).
- Joins in `games` and `consoles` data for display.
- Handles unauthenticated state, empty-library state, and error state.

**Still to verify formally:** cross-user isolation (one user cannot see another's purchases) and production behavior on Vercel — worth a explicit pass if not already done.

## Deployment

- GitHub push completed; Vercel deployment established.
- Hit a deployment environment-variable issue: incorrectly configured Supabase URL caused `getaddrinfo ENOTFOUND`. Root cause was a misconfigured Supabase env var/value. Resolved by correcting Vercel env vars and redeploying.

## Important Decisions Log

- Payments stay mocked; no real payment APIs.
- Purchase data comes from real users interacting with the app, not synthetic generation.
- Keep the application architecture simple; avoid unnecessary services/dependencies.
- Supabase remains database + auth provider. IGDB remains the catalogue source. GitHub remains source control. Vercel remains frontend deployment.

## UI Redesign & Engagement Pass

Scope: search bar, dead "Deals" link, cursor interactivity, overall visual design/colors, plus a follow-up bug fix.

- **Search bar** made functional: live client-side filter by game name (`app/components/GameCatalog.tsx`), with a distinct "no results for X" state vs. "no games available."
- **Deals**: new `/deals` page built with a designed "No deals right now" empty state; nav link fixed (was a dead `href="#"`).
- **Custom interactive cursor**: `app/components/CursorFX.tsx`, a dot+ring cursor that reacts on hover over links/buttons/cards, mounted sitewide via `layout.tsx`. Fine-pointer only, respects `prefers-reduced-motion`. Added explicit `cursor-pointer` to buttons across the app (Tailwind v4 doesn't default this).
- **Design refresh**: new palette (deep indigo-black + violet primary accent + cyan secondary accent, replacing the generic near-black-plus-blue look) and a Space Grotesk display font, applied consistently across every page and shared component. Fixed the default Next.js page title/description, which had never been customized.
- **Bug fix (found during this pass):** cart and checkout were displaying the raw `console_id` (e.g. "Console ID: 1") instead of a readable name. Fixed by adding `consoleName` to `CartItem` and passing it through from `PurchaseActions`; see updated Cart section above. DB inserts still correctly use `consoleId`.

See CLAUDE.md Section 6 (Design System) for the established palette/type/cursor conventions going forward.

## Current Phase: Data Engineering Pipeline (Planned)

Objective: stand up an end-to-end DE project on GamerZone's real transactional data — daily ingestion from Supabase into Snowflake (data lake), then dbt models on top for analysis.

Status: architecture discussion in progress, not yet implemented. See CLAUDE.md Section 13 for what's decided vs. open.

## Source-System Readiness Pass

Context: before building the Supabase → Snowflake extraction, did a correctness pass on the source system itself, since the DE pipeline's incremental-extraction plan and dbt snapshotting depend on it being trustworthy.

- **Found and fixed an `updated_at` bug:** the IGDB ingestion job's `game_prices` upsert changed `price` on every run, but `updated_at` never moved — Postgres `DEFAULT now()` only fires on INSERT, not UPDATE, and no trigger existed to handle the update case. Root-caused to the database layer (not the Python job) and fixed there, since the app/ingestion code should never need to manage its own audit timestamps.
- **Found and fixed an invalid FK design:** `game_prices`/`order_items` each had two single-column FKs into `game_consoles(game_id)`/`game_consoles(console_id)` separately — invalid, since neither column is unique alone on that table (its PK is the composite pair). Replaced with a single composite FK.
- **Established version-controlled schema:** `CLAUDE_CURRENT_DB_STATE.sql` (repo root) is now the schema source of truth — a full drop-and-recreate script (not Supabase-CLI migrations; a plain versioned SQL file was the right fit for a full dev reset). Includes a generic `set_updated_at()` trigger attached to all 8 tables, and FK-column indexes that were missing (`orders.user_id`, `order_items.order_id`, `game_consoles.console_id`).
- **Enabled Row Level Security** on all 8 tables: catalogue tables (`games`/`consoles`/`game_consoles`/`game_prices`) are public read-only (ingestion writes via the service-role key, which bypasses RLS); `users`/`orders`/`order_items`/`payments` are scoped to the owning `auth.uid()`, SELECT + INSERT only.
- **Ran the full reset** (including wiping `auth.users`, since this is a dev environment and friends re-signing up was acceptable) and re-verified checkout/RLS/library end-to-end.
- **Found and fixed a frontend staleness bug** surfaced while verifying: `page.tsx` (home), `games/[id]/page.tsx`, and `deals/page.tsx` are Server Components with no cache config, so Next.js statically cached their Supabase `fetch()` calls indefinitely — prices/catalogue shown in the UI didn't reflect the DB after the ingestion job ran again. Fixed by adding `export const dynamic = "force-dynamic"` to all three, since there's no revalidation hook from the external Python job to do this more surgically.

All of the above verified working end-to-end (checkout, RLS, and price freshness in the UI all confirmed against the live DB after a fresh reset + two ingestion runs).

## Auth Modal Polish

- Sign Up now shows a Retype Password field (client-side match check before submit) that Sign In doesn't.
- Signup auto-logs the user in (closes modal, reloads) instead of bouncing back to Sign In — relies on Supabase returning a session directly, which requires "Confirm email" off in Supabase Auth settings (confirmed off for this project).
- Signing up with an existing email now detects it (via error message or Supabase's empty-`identities` signal, used when confirmations are on) and redirects to Sign In with a clear message, instead of silently failing or looking like success.
