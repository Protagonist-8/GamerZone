"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type Deal = {
  gameId: number;
  gameName: string;
  imageUrl: string | null;
  releaseYear: number | null;
  consoleId: number;
  platformLabel: string;
  price: number;
  maxPrice: number;
};

type Props = {
  deals: Deal[];
};

export default function DealsCatalog({ deals }: Props) {
  const [selectedPlatform, setSelectedPlatform] = useState<number | null>(
    null
  );

  const platforms = useMemo(() => {
    const platformMap = new Map<number, string>();

    deals.forEach((deal) => {
      if (!platformMap.has(deal.consoleId)) {
        platformMap.set(deal.consoleId, deal.platformLabel);
      }
    });

    return Array.from(platformMap.entries())
      .map(([consoleId, label]) => ({ consoleId, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [deals]);

  const filteredDeals = useMemo(() => {
    if (selectedPlatform === null) {
      return deals;
    }

    return deals.filter((deal) => deal.consoleId === selectedPlatform);
  }, [deals, selectedPlatform]);

  if (deals.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#13131f] p-14 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#34e6c8]/30 bg-[#34e6c8]/10">
          <svg
            className="h-7 w-7 text-[#34e6c8]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 7h20v5H2z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M12 22V7" strokeLinecap="round" />
            <path
              d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 className="mt-6 text-2xl font-semibold">No deals right now</h2>

        <p className="mx-auto mt-3 max-w-md text-[#8a8aa3]">
          We don&apos;t have any active discounts at the moment. Check back
          soon — new deals drop regularly.
        </p>

        <Link
          href="/"
          className="mt-8 inline-block cursor-pointer rounded-lg bg-[#7c5cff] px-6 py-3 font-semibold transition-colors hover:bg-[#6a45ff]"
        >
          Browse Games
        </Link>
      </div>
    );
  }

  return (
    <>
      {platforms.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
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

      <div className="mb-6 flex items-center justify-between">
        <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          Active Deals
        </h3>

        <span className="text-sm text-[#8a8aa3]">
          {filteredDeals.length}{" "}
          {filteredDeals.length === 1 ? "deal" : "deals"}
        </span>
      </div>

      {filteredDeals.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#13131f] p-10 text-center">
          <p className="text-[#8a8aa3]">No deals for this platform.</p>

          <button
            onClick={() => setSelectedPlatform(null)}
            className="mt-4 cursor-pointer text-sm text-[#9b8cff] hover:text-[#c4b5ff]"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {filteredDeals.map((deal) => (
            <Link
              key={`${deal.gameId}-${deal.consoleId}`}
              href={`/games/${deal.gameId}`}
              className="group gz-cursor-interactive overflow-hidden rounded-lg border border-white/5 bg-[#13131f] transition-all duration-200 hover:-translate-y-1 hover:border-[#7c5cff]/40 hover:bg-[#191928] hover:shadow-[0_0_30px_-10px_rgba(124,92,255,0.5)]"
            >
              <div className="aspect-[3/4] overflow-hidden">
                {deal.imageUrl ? (
                  <img
                    src={deal.imageUrl}
                    alt={deal.gameName}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#1a1a2c] text-sm text-[#6b6b85]">
                    No Image
                  </div>
                )}
              </div>

              <div className="p-4">
                <h4 className="truncate font-semibold">{deal.gameName}</h4>

                <p className="mt-1 text-xs text-[#8a8aa3]">
                  {deal.releaseYear ?? "Unknown"} • {deal.platformLabel}
                </p>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-semibold text-[#34e6c8]">
                    ₹{deal.price}
                  </span>

                  <span className="text-xs text-[#6b6b85] line-through">
                    ₹{deal.maxPrice}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
