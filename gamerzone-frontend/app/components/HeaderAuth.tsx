"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/supabase";
import { useCart } from "@/app/context/CartContext";
import AuthModal from "./AuthModal";

export default function HeaderAuth() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const { items } = useCart();

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserEmail(user?.email ?? null);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUserEmail(null);
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <Link
          href="/cart"
          className="text-sm text-gray-300 hover:text-white"
        >
          Cart ({items.length})
        </Link>

        {userEmail ? (
          <>
            <Link
              href="/account"
              className="text-sm text-gray-300 hover:text-white"
            >
              Account
            </Link>

            <button
              onClick={handleSignOut}
              className="cursor-pointer rounded-full border border-white/20 px-5 py-2 text-sm transition-colors hover:border-[#7c5cff]/50 hover:bg-white/10"
            >
              Sign Out
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            className="cursor-pointer rounded-full border border-white/20 px-5 py-2 text-sm transition-colors hover:border-[#7c5cff]/50 hover:bg-white/10"
          >
            Sign In
          </button>
        )}
      </div>

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} />
      )}
    </>
  );
}