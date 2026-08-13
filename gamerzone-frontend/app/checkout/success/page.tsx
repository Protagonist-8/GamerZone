import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a14] px-6 text-white">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#13131f] p-10 text-center">

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#34e6c8]/10 text-3xl text-[#34e6c8]">
          ✓
        </div>

        <h1 className="font-[family-name:var(--font-display)] mt-6 text-3xl font-bold">
          Order Successful
        </h1>

        <p className="mt-4 text-[#8a8aa3]">
          Your mock payment was successful.
        </p>

        <p className="mt-2 text-sm text-[#6b6b85]">
          Your purchase will be added to your game library.
        </p>

        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/"
            className="cursor-pointer rounded-lg border border-white/20 px-6 py-3 text-sm transition-colors hover:bg-white/10"
          >
            Continue Shopping
          </Link>

          <Link
            href="/library"
            className="cursor-pointer rounded-lg bg-[#7c5cff] px-6 py-3 text-sm font-semibold transition-colors hover:bg-[#6a45ff]"
          >
            View Library
          </Link>
        </div>

      </div>
    </main>
  );
}
