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

Implemented: Add to Cart, Buy Now, Remove from Cart, Clear Cart, View Cart, cart total, console info per cart item. Managed via React Context (client-side only).

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

## Current Phase: Data Engineering Pipeline (Planned)

Objective: stand up an end-to-end DE project on GamerZone's real transactional data — daily ingestion from Supabase into Snowflake (data lake), then dbt models on top for analysis.

Status: architecture discussion in progress, not yet implemented. See CLAUDE.md Section 17 for what's decided vs. open.
