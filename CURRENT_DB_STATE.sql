-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

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
  CONSTRAINT fk_game_prices_game_console FOREIGN KEY (game_id) REFERENCES public.game_consoles(game_id),
  CONSTRAINT fk_game_prices_game_console FOREIGN KEY (console_id) REFERENCES public.game_consoles(console_id)
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
  CONSTRAINT fk_order_items_game_console FOREIGN KEY (game_id) REFERENCES public.game_consoles(game_id),
  CONSTRAINT fk_order_items_game_console FOREIGN KEY (console_id) REFERENCES public.game_consoles(console_id)
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