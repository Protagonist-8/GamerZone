"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/supabase";
import { useCart } from "@/app/context/CartContext";

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();

  const router = useRouter();

  const [paymentType, setPaymentType] = useState<
    "UPI" | "CARD" | "NET_BANKING" | "WALLET"
  >("UPI");

  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");

  async function handlePlaceOrder() {
    setMessage("");

    if (items.length === 0) {
      setMessage("Your cart is empty.");
      return;
    }

    setProcessing(true);

    try {
      // --------------------------------------------------
      // 1. Get authenticated user
      // --------------------------------------------------

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setMessage("Please sign in before placing an order.");
        setProcessing(false);
        return;
      }

      // --------------------------------------------------
      // 2. Make sure public.users record exists
      // --------------------------------------------------

      const { data: publicUser, error: userError } =
        await supabase
          .from("users")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

      if (userError) {
        console.error("User lookup error:", userError);
        throw new Error("Unable to find user profile.");
      }

      if (!publicUser) {
        const { error: insertUserError } = await supabase
          .from("users")
          .insert({
            user_id: user.id,
            name:
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "Gamer",
            email: user.email,
          });

        if (insertUserError) {
          console.error(
            "User creation error:",
            insertUserError
          );

          throw new Error(
            "Unable to create user profile."
          );
        }
      }

      // --------------------------------------------------
      // 3. Simulate mock payment
      // --------------------------------------------------

      await new Promise((resolve) =>
        setTimeout(resolve, 1000)
      );

      // --------------------------------------------------
      // 4. Create order
      // --------------------------------------------------

      const { data: order, error: orderError } =
        await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            total_amount: total,
            status: "COMPLETED",
          })
          .select("order_id")
          .single();

      if (orderError || !order) {
        console.error("Order creation error:", orderError);
        throw new Error("Unable to create order.");
      }

      // --------------------------------------------------
      // 5. Create order items
      // --------------------------------------------------

      const orderItems = items.map((item) => ({
        order_id: order.order_id,
        game_id: item.gameId,
        console_id: item.consoleId,
        quantity: 1,
        unit_price: item.price,
      }));

      const { error: orderItemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (orderItemsError) {
        console.error(
          "Order items error:",
          orderItemsError
        );
        throw new Error(
          "Unable to create order items."
        );
      }

      // --------------------------------------------------
      // 6. Create successful mock payment
      // --------------------------------------------------

      const transactionReference =
        `MOCK-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase()}`;

      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          order_id: order.order_id,
          payment_type: paymentType,
          payment_status: "SUCCESS",
          amount: total,
          transaction_reference: transactionReference,
          payment_date: new Date().toISOString(),
        });

      if (paymentError) {
        console.error(
          "Payment creation error:",
          paymentError
        );
        throw new Error(
          "Unable to record payment."
        );
      }

      // --------------------------------------------------
      // 7. Clear cart
      // --------------------------------------------------

      clearCart();

      // --------------------------------------------------
      // 8. Go to success page
      // --------------------------------------------------

      router.push("/checkout/success");
    } catch (error) {
      console.error("Checkout error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while processing your order."
      );

      setProcessing(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a14] px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">

        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold">
            Checkout
          </h1>

          <Link
            href="/cart"
            className="text-sm text-[#9b8cff] hover:text-[#c4b5ff]"
          >
            ← Back to Cart
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="mt-12 rounded-xl border border-white/10 bg-[#13131f] p-10 text-center">
            <p className="text-[#8a8aa3]">
              Your cart is empty.
            </p>

            <Link
              href="/"
              className="mt-6 inline-block cursor-pointer rounded-lg bg-[#7c5cff] px-6 py-3 font-semibold transition-colors hover:bg-[#6a45ff]"
            >
              Browse Games
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 md:grid-cols-2">

            {/* Order Summary */}

            <section className="rounded-xl border border-white/10 bg-[#13131f] p-6">
              <h2 className="text-xl font-semibold">
                Order Summary
              </h2>

              <div className="mt-6 space-y-4">
                {items.map((item) => (
                  <div
                    key={`${item.gameId}-${item.consoleId}`}
                    className="flex items-center justify-between border-b border-white/10 pb-4"
                  >
                    <div>
                      <p className="font-medium">
                        {item.gameName}
                      </p>

                      <p className="mt-1 text-sm text-gray-400">
                        {item.consoleName}
                      </p>
                    </div>

                    <p className="font-semibold text-[#34e6c8]">
                      ₹{item.price}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-6">
                <span className="text-[#8a8aa3]">
                  Total
                </span>

                <span className="text-2xl font-bold">
                  ₹{total}
                </span>
              </div>
            </section>

            {/* Payment */}

            <section className="rounded-xl border border-white/10 bg-[#13131f] p-6">
              <h2 className="text-xl font-semibold">
                Payment
              </h2>

              <p className="mt-2 text-sm text-[#8a8aa3]">
                Select a mock payment method.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  {
                    value: "UPI",
                    label: "UPI",
                  },
                  {
                    value: "CARD",
                    label: "Credit / Debit Card",
                  },
                  {
                    value: "NET_BANKING",
                    label: "Net Banking",
                  },
                  {
                    value: "WALLET",
                    label: "Wallet",
                  },
                ].map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() =>
                      setPaymentType(
                        method.value as
                          | "UPI"
                          | "CARD"
                          | "NET_BANKING"
                          | "WALLET"
                      )
                    }
                    className={`w-full cursor-pointer rounded-lg border px-5 py-4 text-left transition-colors ${
                      paymentType === method.value
                        ? "border-[#7c5cff] bg-[#7c5cff]/10"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>

              {message && (
                <p className="mt-5 text-sm text-red-400">
                  {message}
                </p>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={processing}
                className="mt-8 w-full cursor-pointer rounded-lg bg-[#7c5cff] px-6 py-4 font-semibold transition-colors hover:bg-[#6a45ff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processing
                  ? "Processing Mock Payment..."
                  : `Pay ₹${total}`}
              </button>

              <p className="mt-4 text-center text-xs text-[#6b6b85]">
                This is a simulated payment. No real money
                will be charged.
              </p>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
