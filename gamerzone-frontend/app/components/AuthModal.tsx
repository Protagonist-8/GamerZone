"use client";

import { useState } from "react";
import { supabase } from "@/app/supabase";

type AuthModalProps = {
  onClose: () => void;
};

export default function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        onClose();
        window.location.reload();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage(
          "Account created. Please check your email if confirmation is required."
        );
      }
    }

    setLoading(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-white/10 bg-[#13131f] p-6 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold">
            {mode === "signin" ? "Sign In" : "Create Account"}
          </h2>

          <button
            onClick={onClose}
            className="cursor-pointer text-xl text-[#8a8aa3] hover:text-white"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-[#b5b5c9]">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#161625] px-4 py-3 outline-none transition-colors focus:border-[#7c5cff]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-[#b5b5c9]">
              Password
            </label>

            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#161625] px-4 py-3 outline-none transition-colors focus:border-[#7c5cff]"
              placeholder="••••••••"
            />
          </div>

          {message && (
            <p className="text-sm text-[#b5b5c9]">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-lg bg-[#7c5cff] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#6a45ff] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : mode === "signin"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-[#8a8aa3]">
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setMessage("");
                }}
                className="cursor-pointer text-[#9b8cff] hover:text-[#c4b5ff]"
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => {
                  setMode("signin");
                  setMessage("");
                }}
                className="cursor-pointer text-[#9b8cff] hover:text-[#c4b5ff]"
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
