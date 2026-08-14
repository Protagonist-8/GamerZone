-- ============================================================
-- GamerZone — Full Reset Script
-- ============================================================
-- Run this ONCE in the Supabase SQL Editor to fully tear down
-- and recreate the schema from a clean slate.
--
-- WARNING: This is destructive. It deletes ALL data, including
-- auth.users. Friends will need to sign up again. Do not run
-- this against a database you want to keep data in.
--
-- What this does, in order:
--   1. Drop all public schema tables (children first, CASCADE
--      as a safety net).
--   2. Delete all auth.users rows (cascades through Supabase's
--      internal auth.* tables — identities, sessions, etc.).
--   3. Recreate all 8 tables, matching CURRENT_DB_STATE.sql,
--      with one correction: game_prices/order_items now use a
--      single COMPOSITE FK into game_consoles(game_id, console_id)
--      instead of two invalid single-column FKs (the original
--      dump referenced non-unique columns individually, which
--      Postgres cannot enforce — game_consoles' PK is the pair,
--      not either column alone).
--   4. Add a generic updated_at trigger to every table that has
--      the column, so UPDATE (including upsert-driven updates)
--      always refreshes updated_at at the database level —
--      ingestion jobs / the app never need to set it manually.
--   5. Add indexes on FK columns that aren't already covered by
--      a PK/unique index (Postgres doesn't auto-index these).
--   6. Enable RLS on every table and add policies matching the
--      actual query patterns in the app:
--        - games/consoles/game_consoles/game_prices: public read
--          (catalogue is browsable without login; writes only
--          via the ingestion job's service-role key, which
--          bypasses RLS entirely).
--        - users/orders/order_items/payments: users can only
--          read/insert their own rows (auth.uid() = user_id,
--          or via the owning order for child tables). No
--          update/delete policies — the app never updates or
--          deletes these client-side, so none are granted.
-- ============================================================


-- ============================================================
-- 1. DROP (children first; CASCADE as a safety net for anything
--    not explicitly listed, e.g. leftover views/policies)
-- ============================================================

DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.game_prices CASCADE;
DROP TABLE IF EXISTS public.game_consoles CASCADE;
DROP TABLE IF EXISTS public.games CASCADE;
DROP TABLE IF EXISTS public.consoles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;


-- ============================================================
-- 2. Wipe auth.users (cascades through auth.identities,
--    auth.sessions, auth.refresh_tokens, etc.)
-- ============================================================

DELETE FROM auth.users;


-- ============================================================
-- 3. Recreate tables
-- ============================================================

CREATE TABLE public.consoles (
  console_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  source_platform_id bigint NOT NULL UNIQUE,
  console_name text NOT NULL,
  abbreviation text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT consoles_pkey PRIMARY KEY (console_id)
);

CREATE TABLE public.games (
  game_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  source_game_id bigint NOT NULL UNIQUE,
  game_name text NOT NULL,
  release_year integer,
  description text,
  image_id text,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT games_pkey PRIMARY KEY (game_id)
);

CREATE TABLE public.game_consoles (
  game_id bigint NOT NULL,
  console_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT game_consoles_pkey PRIMARY KEY (game_id, console_id),
  CONSTRAINT fk_game_consoles_game FOREIGN KEY (game_id) REFERENCES public.games(game_id),
  CONSTRAINT fk_game_consoles_console FOREIGN KEY (console_id) REFERENCES public.consoles(console_id)
);

CREATE TABLE public.game_prices (
  game_id bigint NOT NULL,
  console_id bigint NOT NULL,
  price numeric NOT NULL CHECK (price >= 0::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT game_prices_pkey PRIMARY KEY (game_id, console_id),
  -- Composite FK fix: game_consoles' PK is (game_id, console_id) together,
  -- so the reference must be composite too — see header note.
  CONSTRAINT fk_game_prices_game_console FOREIGN KEY (game_id, console_id)
    REFERENCES public.game_consoles(game_id, console_id)
);

CREATE TABLE public.users (
  user_id uuid NOT NULL,
  name text,
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (user_id),
  CONSTRAINT users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.orders (
  order_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  order_date timestamp with time zone NOT NULL DEFAULT now(),
  total_amount numeric NOT NULL CHECK (total_amount >= 0::numeric),
  status text NOT NULL DEFAULT 'PENDING'::text CHECK (status = ANY (ARRAY['PENDING'::text, 'CONFIRMED'::text, 'CANCELLED'::text, 'COMPLETED'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (order_id),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);

CREATE TABLE public.order_items (
  order_item_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id bigint NOT NULL,
  game_id bigint NOT NULL,
  console_id bigint NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (order_item_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
  -- Composite FK fix (same reasoning as game_prices above).
  CONSTRAINT fk_order_items_game_console FOREIGN KEY (game_id, console_id)
    REFERENCES public.game_consoles(game_id, console_id)
);

CREATE TABLE public.payments (
  payment_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id bigint NOT NULL UNIQUE,
  payment_type text NOT NULL CHECK (payment_type = ANY (ARRAY['UPI'::text, 'CARD'::text, 'NET_BANKING'::text, 'WALLET'::text])),
  payment_status text NOT NULL DEFAULT 'PENDING'::text CHECK (payment_status = ANY (ARRAY['PENDING'::text, 'SUCCESS'::text, 'FAILED'::text, 'REFUNDED'::text])),
  amount numeric NOT NULL CHECK (amount >= 0::numeric),
  transaction_reference text UNIQUE,
  payment_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (payment_id),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES public.orders(order_id)
);


-- ============================================================
-- 4. updated_at trigger — generic function, attached to every
--    table that has the column. This is what actually fixes
--    the ingestion bug: on any UPDATE (including upsert-driven
--    updates from igdb_to_supabase_job.py), updated_at is
--    stamped at the database level regardless of which client
--    or process performed the write.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_updated_at
  BEFORE UPDATE ON public.consoles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_set_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_set_updated_at
  BEFORE UPDATE ON public.game_consoles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_set_updated_at
  BEFORE UPDATE ON public.game_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_set_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_set_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 5. Indexes on FK columns not already covered by a PK/unique
--    index (Postgres does not auto-index FK columns)
-- ============================================================

CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_game_consoles_console_id ON public.game_consoles(console_id);
-- payments.order_id already has an index via its UNIQUE constraint.
-- game_prices/order_items composite FK columns already covered by
-- their own composite PKs (game_id leads both).


-- ============================================================
-- 6. Row Level Security
-- ============================================================

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consoles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_consoles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Catalogue tables: public, read-only. Browsing (home, deals,
-- game details, library) works signed-out or signed-in; writes
-- only ever happen via the ingestion job's sb_secret_* key,
-- which bypasses RLS entirely, so no write policy is needed.
CREATE POLICY "Public read access" ON public.games
  FOR SELECT USING (true);

CREATE POLICY "Public read access" ON public.consoles
  FOR SELECT USING (true);

CREATE POLICY "Public read access" ON public.game_consoles
  FOR SELECT USING (true);

CREATE POLICY "Public read access" ON public.game_prices
  FOR SELECT USING (true);

-- users: a signed-in user can see and create their own profile
-- row (checkout/page.tsx creates it lazily on first purchase).
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- orders: a signed-in user can see and create their own orders
-- (checkout/page.tsx inserts; library/page.tsx reads via join).
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- order_items: no user_id column directly — ownership is via
-- the parent order, so check through it.
CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.order_id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own order items" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.order_id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- payments: same ownership-via-order pattern.
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.order_id = payments.order_id
        AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own payments" ON public.payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.order_id = payments.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- No UPDATE/DELETE policies anywhere: the app never updates or
-- deletes orders/order_items/payments/users client-side, so none
-- are granted (least privilege). Add explicitly if that changes.
