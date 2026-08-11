import Link from "next/link";
import HeaderAuth from "@/app/components/HeaderAuth";
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

  console.log("Games:", games?.length);
  console.log("Prices:", prices?.length);
  console.log("Games error:", gamesError);
  console.log("Prices error:", pricesError);

  if (gamesError || pricesError) {
    console.error("Games error:", gamesError);
    console.error("Prices error:", pricesError);

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070d] text-white">
        <p className="text-red-400">
          Unable to load games.
        </p>
      </main>
    );
  }

  const typedGames = (games ?? []) as Game[];
  const typedPrices = (prices ?? []) as GamePrice[];

  const priceMap = new Map<string, number>();

  typedPrices.forEach((item) => {
    priceMap.set(
      `${item.game_id}-${item.console_id}`,
      Number(item.price)
    );
  });

  return (
    <main className="min-h-screen bg-[#05070d] text-white">

      <header className="border-b border-white/10 bg-[#080b14]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <Link
            href="/"
            className="text-2xl font-bold tracking-wide text-blue-400"
          >
            GAMER<span className="text-white">ZONE</span>
          </Link>

          <nav className="hidden gap-8 text-sm text-gray-300 md:flex">
            <Link href="/" className="text-white">
              Games
            </Link>

            <Link href="/library" className="hover:text-white">
              My Library
            </Link>

            <Link href="#" className="hover:text-white">
              Deals
            </Link>

            <Link href="#" className="hover:text-white">
              New Releases
            </Link>
          </nav>

          <HeaderAuth />

        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-14">

        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-400">
          Play beyond limits
        </p>

        <h2 className="text-4xl font-bold md:text-6xl">
          Discover your next game.
        </h2>

        <p className="mt-5 max-w-2xl text-gray-400">
          Explore the latest releases, legendary adventures, and unforgettable
          worlds.
        </p>

        <div className="mt-8 max-w-xl">
          <input
            type="text"
            placeholder="Search games..."
            className="w-full rounded-lg border border-white/10 bg-[#101522] px-5 py-4 text-white outline-none placeholder:text-gray-500 focus:border-blue-500"
          />
        </div>

      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">

        <div className="mb-6 flex items-center justify-between">

          <h3 className="text-2xl font-semibold">
            Popular Games
          </h3>

          <button className="text-sm text-blue-400 hover:text-blue-300">
            View All →
          </button>

        </div>

        {typedGames.length === 0 ? (

          <p className="text-gray-400">
            No games available.
          </p>

        ) : (

          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">

            {typedGames.map((game) => {

              const platforms =
                game.game_consoles
                  ?.map((relationship) => {
                    const console = relationship.consoles?.[0];

                    return (
                      console?.abbreviation ||
                      console?.console_name
                    );
                  })
                  .filter(Boolean) || [];

              const pricesForGame =
                game.game_consoles
                  ?.map((relationship) => {
                    const key = `${game.game_id}-${relationship.console_id}`;
                    return priceMap.get(key);
                  })
                  .filter(
                    (price): price is number =>
                      price !== undefined
                  ) || [];

              const lowestPrice =
                pricesForGame.length > 0
                  ? Math.min(...pricesForGame)
                  : null;

              return (
                <Link
                  key={game.game_id}
                  href={`/games/${game.game_id}`}
                  className="group overflow-hidden rounded-lg bg-[#0d111c] transition hover:-translate-y-1 hover:bg-[#141a29]"
                >

                  <div className="aspect-[3/4] overflow-hidden">

                    {game.image_url ? (

                      <img
                        src={game.image_url}
                        alt={game.game_name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />

                    ) : (

                      <div className="flex h-full w-full items-center justify-center bg-[#151b2a] text-sm text-gray-500">
                        No Image
                      </div>

                    )}

                  </div>

                  <div className="p-4">

                    <h4 className="truncate font-semibold">
                      {game.game_name}
                    </h4>

                    <p className="mt-1 text-xs text-gray-500">
                      {game.release_year ?? "Unknown"} •{" "}
                      {platforms.join(", ")}
                    </p>

                    {lowestPrice !== null ? (

                      <p className="mt-3 font-semibold text-blue-400">
                        From ₹{lowestPrice}
                      </p>

                    ) : (

                      <p className="mt-3 text-sm text-gray-500">
                        Price unavailable
                      </p>

                    )}

                  </div>

                </Link>
              );
            })}

          </div>
        )}

      </section>

    </main>
  );
}