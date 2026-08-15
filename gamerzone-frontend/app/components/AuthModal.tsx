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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");

    if (mode === "signup" && password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      // Supabase intentionally does not return a normal error for a
      // duplicate email when "Confirm email" is enabled (anti-enumeration
      // protection) — instead it returns a success-shaped response with an
      // empty `identities` array. Check both signals.
      const looksLikeExistingUser =
        (error && /already registered|already exists/i.test(error.message)) ||
        (!error && data.user && data.user.identities?.length === 0);

      if (looksLikeExistingUser) {
        setMode("signin");
        setPassword("");
        setConfirmPassword("");
        setMessage("An account with this email already exists. Please sign in.");
      } else if (error) {
        setMessage(error.message);
      } else if (data.session) {
        // Email confirmation is off — Supabase returned a session, so the
        // new user is already authenticated. Behave exactly like sign-in.
        onClose();
        window.location.reload();
      } else {
        // New account created, but email confirmation is required before a
        // session can be issued — true auto-login isn't possible here.
        setMode("signin");
        setPassword("");
        setConfirmPassword("");
        setMessage(
          "Account created. Please check your email to confirm your account, then sign in."
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

          {mode === "signup" && (
            <div>
              <label className="mb-2 block text-sm text-[#b5b5c9]">
                Retype Password
              </label>

              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#161625] px-4 py-3 outline-none transition-colors focus:border-[#7c5cff]"
                placeholder="••••••••"
              />
            </div>
          )}

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
                onClick={() => switchMode("signup")}
                className="cursor-pointer text-[#9b8cff] hover:text-[#c4b5ff]"
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => switchMode("signin")}
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
