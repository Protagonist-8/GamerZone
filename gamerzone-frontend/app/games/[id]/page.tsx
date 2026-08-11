import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/app/supabase";
import PurchaseActions from "@/app/components/PurchaseActions";

type ConsoleData = {
  console_name: string | null;
  abbreviation: string | null;
};

type GameConsoleData = {
  console_id: number;
  consoles: ConsoleData | ConsoleData[] | null;
};

type GameData = {
  game_id: number;
  game_name: string;
  release_year: number | null;
  description: string | null;
  image_url: string | null;
  game_consoles: GameConsoleData[] | null;
};

type GamePrice = {
  game_id: number;
  console_id: number;
  price: number;
};

export default async function GameDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gameId = Number(id);

  if (Number.isNaN(gameId)) {
    notFound();
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select(`
      game_id,
      game_name,
      release_year,
      description,
      image_url,
      game_consoles (
        console_id,
        consoles (
          console_name,
          abbreviation
        )
      )
    `)
    .eq("game_id", gameId)
    .single();

  const { data: prices, error: pricesError } = await supabase
    .from("game_prices")
    .select("game_id, console_id, price")
    .eq("game_id", gameId);

  if (gameError || pricesError || !game) {
    console.error("Game error:", gameError);
    console.error("Prices error:", pricesError);
    notFound();
  }

  const typedGame = game as unknown as GameData;
  const typedPrices = (prices ?? []) as GamePrice[];

  const priceMap = new Map<number, number>();

  typedPrices.forEach((item) => {
    priceMap.set(item.console_id, Number(item.price));
  });

  const platforms =
    typedGame.game_consoles?.map((relationship) => {
      const consoleData = relationship.consoles;

      const consoleInfo = Array.isArray(consoleData)
        ? consoleData[0]
        : consoleData;

      return {
        consoleId: relationship.console_id,
        name:
          consoleInfo?.abbreviation ||
          consoleInfo?.console_name ||
          "Unknown",
        price: priceMap.get(relationship.console_id) ?? null,
      };
    }) || [];

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <header className="border-b border-white/10 bg-[#080b14]">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <Link
            href="/"
            className="text-2xl font-bold text-blue-400"
          >
            GAMER<span className="text-white">ZONE</span>
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-2">
        <div>
          {typedGame.image_url ? (
            <img
              src={typedGame.image_url}
              alt={typedGame.game_name}
              className="w-full rounded-xl object-cover"
            />
          ) : (
            <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl bg-[#151b2a] text-gray-500">
              No Image
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <h1 className="text-4xl font-bold md:text-5xl">
            {typedGame.game_name}
          </h1>

          <p className="mt-3 text-gray-400">
            Released {typedGame.release_year ?? "Unknown"}
          </p>

          <p className="mt-8 leading-7 text-gray-300">
            {typedGame.description || "No description available."}
          </p>

          <PurchaseActions
            gameId={typedGame.game_id}
            gameName={typedGame.game_name}
            platforms={platforms}
          />

          <Link
            href="/"
            className="mt-6 w-fit text-sm text-gray-400 hover:text-white"
          >
            ← Back to Games
          </Link>
        </div>
      </section>
    </main>
  );
}
