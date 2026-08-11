import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070d] px-6 text-white">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0d111c] p-10 text-center">

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-3xl text-green-400">
          ✓
        </div>

        <h1 className="mt-6 text-3xl font-bold">
          Order Successful
        </h1>

        <p className="mt-4 text-gray-400">
          Your mock payment was successful.
        </p>

        <p className="mt-2 text-sm text-gray-500">
          Your purchase will be added to your game library.
        </p>

        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg border border-white/20 px-6 py-3 text-sm hover:bg-white/10"
          >
            Continue Shopping
          </Link>

          <Link
            href="/"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold hover:bg-blue-500"
          >
            Browse Games
          </Link>
        </div>

      </div>
    </main>
  );
}
