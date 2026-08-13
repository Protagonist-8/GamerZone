"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/app/context/CartContext";

export default function CartPage() {
  const { items, removeFromCart, clearCart, total } = useCart();

  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#0a0a14] px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold">
            Your Cart
          </h1>

          <Link
            href="/"
            className="text-sm text-[#9b8cff] hover:text-[#c4b5ff]"
          >
            ← Continue Shopping
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="mt-12 rounded-xl border border-white/10 bg-[#13131f] p-10 text-center">
            <p className="text-[#8a8aa3]">Your cart is empty.</p>

            <Link
              href="/"
              className="mt-6 inline-block cursor-pointer rounded-lg bg-[#7c5cff] px-6 py-3 font-semibold transition-colors hover:bg-[#6a45ff]"
            >
              Browse Games
            </Link>
          </div>
        ) : (
          <div className="mt-10 space-y-4">
            {items.map((item) => (
              <div
                key={`${item.gameId}-${item.consoleId}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-[#13131f] p-5 transition-colors hover:border-white/20"
              >
                <div>
                  <h2 className="font-semibold">{item.gameName}</h2>

                  <p className="mt-1 text-sm text-[#8a8aa3]">
                    {item.consoleName}
                  </p>

                  <p className="mt-1 text-sm text-[#34e6c8]">
                    ₹{item.price}
                  </p>
                </div>

                <button
                  onClick={() => removeFromCart(item.gameId)}
                  className="cursor-pointer text-sm text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ))}

            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
              <div>
                <p className="text-sm text-[#8a8aa3]">Total</p>

                <p className="text-2xl font-bold">₹{total}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={clearCart}
                  className="cursor-pointer rounded-lg border border-white/20 px-5 py-3 text-sm transition-colors hover:bg-white/10"
                >
                  Clear Cart
                </button>

                <button
                  onClick={() => router.push("/checkout")}
                  className="cursor-pointer rounded-lg bg-[#7c5cff] px-6 py-3 font-semibold transition-colors hover:bg-[#6a45ff]"
                >
                  Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
