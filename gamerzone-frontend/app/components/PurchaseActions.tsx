"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/supabase";
import { useCart } from "@/app/context/CartContext";
import AuthModal from "./AuthModal";

type Platform = {
  consoleId: number;
  name: string;
  price: number | null;
};

type PurchaseActionsProps = {
  gameId: number;
  gameName: string;
  platforms: Platform[];
};

export default function PurchaseActions({
  gameId,
  gameName,
  platforms,
}: PurchaseActionsProps) {
  const [selectedConsoleId, setSelectedConsoleId] = useState<number | null>(
    platforms.length > 0 ? platforms[0].consoleId : null
  );

  const [showAuth, setShowAuth] = useState(false);
  const [message, setMessage] = useState("");

  const { addToCart } = useCart();
  const router = useRouter();

  const selectedPlatform = platforms.find(
    (platform) => platform.consoleId === selectedConsoleId
  );

  const selectedPrice = selectedPlatform?.price ?? null;

  async function checkAuthentication() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  }

  async function handleAddToCart() {
    const user = await checkAuthentication();

    if (!user) {
      setShowAuth(true);
      return;
    }

    if (selectedPlatform === undefined || selectedPrice === null) {
      return;
    }

    addToCart({
      gameId,
      gameName,
      consoleId: selectedPlatform.consoleId,
      price: selectedPrice,
    });

    setMessage(`${gameName} added to cart.`);
  }

  async function handleBuyNow() {
    const user = await checkAuthentication();

    if (!user) {
      setShowAuth(true);
      return;
    }

    if (selectedPlatform === undefined || selectedPrice === null) {
      return;
    }

    addToCart({
      gameId,
      gameName,
      consoleId: selectedPlatform.consoleId,
      price: selectedPrice,
    });

    router.push("/cart");
  }

  return (
    <>
      <div className="mt-8">
        <p className="mb-4 text-sm uppercase tracking-widest text-blue-400">
          Choose Platform
        </p>

        <div className="space-y-3">
          {platforms.map((platform) => {
            const isSelected =
              platform.consoleId === selectedConsoleId;

            return (
              <button
                key={platform.consoleId}
                type="button"
                onClick={() =>
                  setSelectedConsoleId(platform.consoleId)
                }
                disabled={platform.price === null}
                className={`flex w-full items-center justify-between rounded-lg border px-5 py-4 text-left transition ${
                  isSelected
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-white/10 bg-[#0d111c] hover:border-white/30"
                } ${
                  platform.price === null
                    ? "cursor-not-allowed opacity-50"
                    : ""
                }`}
              >
                <span className="font-medium">
                  {platform.name}
                </span>

                <span className="font-semibold text-blue-400">
                  {platform.price !== null
                    ? `₹${platform.price}`
                    : "Price unavailable"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={handleBuyNow}
          disabled={selectedPrice === null}
          className="rounded-lg bg-blue-600 px-8 py-3 font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Buy Now
        </button>

        <button
          onClick={handleAddToCart}
          disabled={selectedPrice === null}
          className="rounded-lg border border-white/20 px-8 py-3 font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add to Cart
        </button>
      </div>

      {message && (
        <div className="mt-4 flex items-center gap-4">
          <p className="text-sm text-green-400">
            {message}
          </p>

          <button
            onClick={() => router.push("/cart")}
            className="text-sm font-medium text-blue-400 hover:text-blue-300"
          >
            View Cart →
          </button>
        </div>
      )}

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} />
      )}
    </>
  );
}
