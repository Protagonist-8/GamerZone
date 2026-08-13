import Link from "next/link";
import HeaderAuth from "@/app/components/HeaderAuth";
import GameCatalog from "@/app/components/GameCatalog";
import { supabase } from "@/app/supabase";

type Console = {
  console_name: string | null;
  abbreviation: string | null;
};

type GameConsole = {
  console_id: number;
  consoles: Console[];
};

type Game = {
  game_id: number;
  game_name: string;
  release_year: number | null;
  image_url: string | null;
  game_consoles: GameConsole[];
};

type GamePrice = {
  game_id: number;
  console_id: number;
  price: number;
};

export default async function Home() {
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select(`
      game_id,
      game_name,
      release_year,
      image_url,
      game_consoles (
        console_id,
        consoles (
          console_name,
          abbreviation
        )
      )
    `)
    .order("game_name");

  const { data: prices, error: pricesError } = await supabase
    .from("game_prices")
    .select("game_id, console_id, price");

  if (gamesError || pricesError) {
    console.error("Games error:", gamesError);
    console.error("Prices error:", pricesError);

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a14] text-white">
        <p className="text-red-400">Unable to load games.</p>
      </main>
    );
  }

  const typedGames = (games ?? []) as Game[];
  const typedPrices = (prices ?? []) as GamePrice[];

  const priceMap: Record<string, number> = {};

  typedPrices.forEach((item) => {
    priceMap[`${item.game_id}-${item.console_id}`] = Number(item.price);
  });

  return (
    <main className="min-h-screen bg-[#0a0a14] text-white">
      <header className="border-b border-white/10 bg-[#0d0d1a]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-wide text-[#9b8cff]"
          >
            GAMER<span className="text-white">ZONE</span>
          </Link>

          <nav className="hidden gap-8 text-sm text-[#b5b5c9] md:flex">
            <Link href="/" className="text-white">
              Games
            </Link>

            <Link href="/library" className="transition-colors hover:text-white">
              My Library
            </Link>

            <Link href="/deals" className="transition-colors hover:text-white">
              Deals
            </Link>

            <Link href="#" className="transition-colors hover:text-white">
              New Releases
            </Link>
          </nav>

          <HeaderAuth />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-[#34e6c8]">
          Play beyond limits
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold md:text-6xl">
          Discover your next game.
        </h2>

        <p className="mt-5 max-w-2xl text-[#8a8aa3]">
          Explore the latest releases, legendary adventures, and unforgettable
          worlds.
        </p>
      </section>

      <div className="mx-auto max-w-7xl px-6">
        <GameCatalog games={typedGames} priceMap={priceMap} />
      </div>
    </main>
  );
}
