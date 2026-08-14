import fs from "fs";
import path from "path";
import Link from "next/link";
import HeaderAuth from "@/app/components/HeaderAuth";
import DealsCatalog, { type Deal } from "@/app/components/DealsCatalog";
import { supabase } from "@/app/supabase";

// See app/page.tsx — same staleness issue, same fix.
export const dynamic = "force-dynamic";

type GameData = {
  game_id: number;
  game_name: string;
  image_url: string | null;
  release_year: number | null;
};

type ConsoleData = {
  console_id: number;
  console_name: string | null;
  abbreviation: string | null;
};

type GameConsoleEmbed = {
  games: GameData | GameData[] | null;
  consoles: ConsoleData | ConsoleData[] | null;
};

type GamePriceRow = {
  game_id: number;
  console_id: number;
  price: number;
  game_consoles: GameConsoleEmbed | GameConsoleEmbed[] | null;
};

function loadPlatformMaxPrices(): Record<string, number> {
  const varsPath = path.join(process.cwd(), "config", "vars.json");
  const raw = fs.readFileSync(varsPath, "utf-8");
  const vars = JSON.parse(raw) as {
    platform_price_tiers: Record<string, number[]>;
  };

  const platformMax: Record<string, number> = {};

  for (const [platform, tiers] of Object.entries(
    vars.platform_price_tiers
  )) {
    platformMax[platform] = Math.max(...tiers);
  }

  return platformMax;
}

export default async function DealsPage() {
  const platformMax = loadPlatformMaxPrices();

  const { data, error } = await supabase.from("game_prices").select(`
      game_id,
      console_id,
      price,
      game_consoles (
        games ( game_id, game_name, image_url, release_year ),
        consoles ( console_id, console_name, abbreviation )
      )
    `);

  if (error) {
    console.error("Deals query error:", error);
  }

  const rows = (data ?? []) as unknown as GamePriceRow[];

  const deals: Deal[] = rows
    .map((row) => {
      const gameConsole = Array.isArray(row.game_consoles)
        ? row.game_consoles[0]
        : row.game_consoles;

      const game = Array.isArray(gameConsole?.games)
        ? gameConsole.games[0]
        : gameConsole?.games;

      const consoleInfo = Array.isArray(gameConsole?.consoles)
        ? gameConsole.consoles[0]
        : gameConsole?.consoles;

      if (!game || !consoleInfo?.console_name) {
        return null;
      }

      const maxPrice = platformMax[consoleInfo.console_name];
      const price = Number(row.price);

      if (maxPrice === undefined || price >= maxPrice) {
        return null;
      }

      return {
        gameId: game.game_id,
        gameName: game.game_name,
        imageUrl: game.image_url,
        releaseYear: game.release_year,
        consoleId: consoleInfo.console_id,
        platformLabel:
          consoleInfo.abbreviation || consoleInfo.console_name,
        price,
        maxPrice,
      };
    })
    .filter((deal): deal is Deal => deal !== null)
    .sort((a, b) => b.maxPrice - b.price - (a.maxPrice - a.price));

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
            <Link href="/" className="transition-colors hover:text-white">
              Games
            </Link>

            <Link
              href="/library"
              className="transition-colors hover:text-white"
            >
              My Library
            </Link>

            <Link href="/deals" className="text-white">
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
          Deals
        </p>

        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold md:text-6xl">
          Deals &amp; discounts.
        </h1>

        <p className="mt-5 max-w-2xl text-[#8a8aa3]">
          Price drops across every platform, all in one place.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <DealsCatalog deals={deals} />
      </section>
    </main>
  );
}
