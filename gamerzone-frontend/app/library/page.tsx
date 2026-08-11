"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/app/supabase";

type OrderItem = {
  game_id: number;
  console_id: number;
  unit_price: number;
};

type Game = {
  game_id: number;
  game_name: string;
  release_year: number | null;
  image_url: string | null;
};

type Console = {
  console_id: number;
  console_name: string;
  abbreviation: string | null;
};

type LibraryItem = {
  game: Game;
  console: Console | null;
  price: number;
};

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadLibrary() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSignedIn(false);
        setLoading(false);
        return;
      }

      const { data: orderItems, error: orderItemsError } =
        await supabase
          .from("order_items")
          .select(`
            game_id,
            console_id,
            unit_price,
            orders!inner (
              user_id,
              status
            )
          `)
          .eq("orders.user_id", user.id)
          .in("orders.status", ["CONFIRMED", "COMPLETED"]);

      if (orderItemsError) {
        console.error("Library order error:", orderItemsError);
        setError("Unable to load your library.");
        setLoading(false);
        return;
      }

      const typedOrderItems = (orderItems ?? []) as OrderItem[];

      if (typedOrderItems.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const gameIds = [
        ...new Set(typedOrderItems.map((item) => item.game_id)),
      ];

      const consoleIds = [
        ...new Set(typedOrderItems.map((item) => item.console_id)),
      ];

      const [{ data: games, error: gamesError }, { data: consoles, error: consolesError }] =
        await Promise.all([
          supabase
            .from("games")
            .select("game_id, game_name, release_year, image_url")
            .in("game_id", gameIds),

          supabase
            .from("consoles")
            .select("console_id, console_name, abbreviation")
            .in("console_id", consoleIds),
        ]);

      if (gamesError || consolesError) {
        console.error("Games error:", gamesError);
        console.error("Consoles error:", consolesError);

        setError("Unable to load your library.");
        setLoading(false);
        return;
      }

      const gameMap = new Map<number, Game>();

      (games ?? []).forEach((game) => {
        gameMap.set(game.game_id, game as Game);
      });

      const consoleMap = new Map<number, Console>();

      (consoles ?? []).forEach((console) => {
        consoleMap.set(console.console_id, console as Console);
      });

      const libraryItems: LibraryItem[] = [];

      typedOrderItems.forEach((orderItem) => {
        const game = gameMap.get(orderItem.game_id);

        if (!game) {
          return;
        }

        libraryItems.push({
          game,
          console: consoleMap.get(orderItem.console_id) ?? null,
          price: Number(orderItem.unit_price),
        });
      });

      setItems(libraryItems);
      setLoading(false);
    }

    loadLibrary();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070d] text-white">
        <p className="text-gray-400">Loading your library...</p>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className="min-h-screen bg-[#05070d] px-6 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to Games
          </Link>

          <div className="mt-12 rounded-xl border border-white/10 bg-[#0d111c] p-10 text-center">
            <h1 className="text-3xl font-bold">
              Sign in to view your library
            </h1>

            <p className="mt-3 text-gray-400">
              Your purchased games will appear here.
            </p>

            <Link
              href="/"
              className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"
            >
              Go to Games
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070d] text-white">
        <p className="text-red-400">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070d] px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">
              My Library
            </h1>

            <p className="mt-2 text-gray-400">
              Your purchased games
            </p>
          </div>

          <Link
            href="/"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Continue Shopping
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="mt-12 rounded-xl border border-white/10 bg-[#0d111c] p-10 text-center">
            <h2 className="text-2xl font-semibold">
              Your library is empty
            </h2>

            <p className="mt-3 text-gray-400">
              Purchase a game and it will appear here.
            </p>

            <Link
              href="/"
              className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"
            >
              Browse Games
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item, index) => (
              <Link
                key={`${item.game.game_id}-${item.console?.console_id}-${index}`}
                href={`/games/${item.game.game_id}`}
                className="group overflow-hidden rounded-lg bg-[#0d111c] transition hover:-translate-y-1 hover:bg-[#141a29]"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  {item.game.image_url ? (
                    <img
                      src={item.game.image_url}
                      alt={item.game.game_name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#151b2a] text-sm text-gray-500">
                      No Image
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h2 className="truncate font-semibold">
                    {item.game.game_name}
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    {item.game.release_year ?? "Unknown"}
                    {" • "}
                    {item.console?.abbreviation ||
                      item.console?.console_name ||
                      "Unknown"}
                  </p>

                  <p className="mt-3 text-sm font-semibold text-green-400">
                    Purchased
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}