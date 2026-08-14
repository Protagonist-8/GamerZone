"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type Console = {
  console_name: string | null;
  abbreviation: string | null;
};

export type GameConsole = {
  console_id: number;
  consoles: Console[];
};

export type Game = {
  game_id: number;
  game_name: string;
  release_year: number | null;
  image_url: string | null;
  game_consoles: GameConsole[];
};

type Props = {
  games: Game[];
  priceMap: Record<string, number>;
};

export default function GameCatalog({ games, priceMap }: Props) {
  const [query, setQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<number | null>(
    null
  );

  const platforms = useMemo(() => {
    const platformMap = new Map<number, string>();

    games.forEach((game) => {
      game.game_consoles?.forEach((relationship) => {
        const consoleInfo = relationship.consoles?.[0];
        const label =
          consoleInfo?.abbreviation || consoleInfo?.console_name;

        if (label && !platformMap.has(relationship.console_id)) {
          platformMap.set(relationship.console_id, label);
        }
      });
    });

    return Array.from(platformMap.entries())
      .map(([consoleId, label]) => ({ consoleId, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [games]);

  const filteredGames = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return games.filter((game) => {
      const matchesQuery =
        !normalized || game.game_name.toLowerCase().includes(normalized);

      const matchesPlatform =
        selectedPlatform === null ||
        game.game_consoles?.some(
          (relationship) => relationship.console_id === selectedPlatform
        );

      return matchesQuery && matchesPlatform;
    });
  }, [games, query, selectedPlatform]);

  const hasActiveFilters = query.trim() !== "" || selectedPlatform !== null;

  return (
    <>
      <div className="mt-8 max-w-xl">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b6b85]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>

          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search games..."
            className="w-full rounded-lg border border-white/10 bg-[#161625] py-4 pl-12 pr-5 text-white outline-none placeholder:text-[#6b6b85] transition-colors focus:border-[#7c5cff]"
          />
        </div>
      </div>

      {platforms.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedPlatform(null)}
            className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedPlatform === null
                ? "border-[#7c5cff] bg-[#7c5cff] text-white"
                : "border-white/10 bg-[#161625] text-[#b5b5c9] hover:border-[#7c5cff]/40 hover:text-white"
            }`}
          >
            All Platforms
          </button>

          {platforms.map((platform) => (
            <button
              key={platform.consoleId}
              onClick={() => setSelectedPlatform(platform.consoleId)}
              className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedPlatform === platform.consoleId
                  ? "border-[#7c5cff] bg-[#7c5cff] text-white"
                  : "border-white/10 bg-[#161625] text-[#b5b5c9] hover:border-[#7c5cff]/40 hover:text-white"
              }`}
            >
              {platform.label}
            </button>
          ))}
        </div>
      )}

      <section className="mx-auto max-w-7xl pb-16 pt-12">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            {hasActiveFilters ? "Search Results" : "Popular Games"}
          </h3>

          <span className="text-sm text-[#8a8aa3]">
            {filteredGames.length}{" "}
            {filteredGames.length === 1 ? "game" : "games"}
          </span>
        </div>

        {games.length === 0 ? (
          <p className="text-[#8a8aa3]">No games available.</p>
        ) : filteredGames.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#13131f] p-10 text-center">
            <p className="text-[#8a8aa3]">
              {query
                ? `No games match "${query}".`
                : "No games for this platform."}
            </p>

            <button
              onClick={() => {
                setQuery("");
                setSelectedPlatform(null);
              }}
              className="mt-4 cursor-pointer text-sm text-[#9b8cff] hover:text-[#c4b5ff]"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {filteredGames.map((game) => {
              const platformLabels =
                game.game_consoles
                  ?.map((relationship) => {
                    const consoleInfo = relationship.consoles?.[0];

                    return (
                      consoleInfo?.abbreviation ||
                      consoleInfo?.console_name
                    );
                  })
                  .filter(Boolean) || [];

              const pricesForGame =
                game.game_consoles
                  ?.map((relationship) => {
                    const key = `${game.game_id}-${relationship.console_id}`;
                    return priceMap[key];
                  })
                  .filter(
                    (price): price is number => price !== undefined
                  ) || [];

              const lowestPrice =
                pricesForGame.length > 0
                  ? Math.min(...pricesForGame)
                  : null;

              const platformPrice =
                selectedPlatform !== null
                  ? priceMap[`${game.game_id}-${selectedPlatform}`]
                  : undefined;

              const displayPrice =
                platformPrice !== undefined ? platformPrice : lowestPrice;

              return (
                <Link
                  key={game.game_id}
                  href={`/games/${game.game_id}`}
                  className="group gz-cursor-interactive overflow-hidden rounded-lg border border-white/5 bg-[#13131f] transition-all duration-200 hover:-translate-y-1 hover:border-[#7c5cff]/40 hover:bg-[#191928] hover:shadow-[0_0_30px_-10px_rgba(124,92,255,0.5)]"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    {game.image_url ? (
                      <img
                        src={game.image_url}
                        alt={game.game_name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#1a1a2c] text-sm text-[#6b6b85]">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h4 className="truncate font-semibold">
                      {game.game_name}
                    </h4>

                    <p className="mt-1 text-xs text-[#8a8aa3]">
                      {game.release_year ?? "Unknown"} •{" "}
                      {platformLabels.join(", ")}
                    </p>

                    {displayPrice !== null ? (
                      <p className="mt-3 font-semibold text-[#34e6c8]">
                        ₹{displayPrice}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-[#6b6b85]">
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
    </>
  );
}
