import Link from "next/link";
import HeaderAuth from "@/app/components/HeaderAuth";

export default function DealsPage() {
  return (
    <main className="min-h-screen bg-[#0a0a14] text-white">
      <header className="border-b border-white/10 bg-[#0d0d1a]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-wide text-[#9b8cff]"
          >
            GAMER<span className="text-white">ZONE</span>
          </Link>

          <nav className="hidden gap-8 text-sm text-[#b5b5c9] md:flex">
            <Link href="/" className="transition-colors hover:text-white">
              Games
            </Link>

            <Link href="/library" className="transition-colors hover:text-white">
              My Library
            </Link>

            <Link href="/deals" className="text-white">
              Deals
            </Link>

            <Link href="#" className="transition-colors hover:text-white">
              New Releases
            </Link>
          </nav>

          <HeaderAuth />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-[#34e6c8]">
          Deals
        </p>

        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold md:text-6xl">
          Deals &amp; discounts.
        </h1>

        <p className="mt-5 max-w-2xl text-[#8a8aa3]">
          Price drops across every platform, all in one place.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
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

          <h2 className="mt-6 text-2xl font-semibold">
            No deals right now
          </h2>

          <p className="mx-auto mt-3 max-w-md text-[#8a8aa3]">
            We don&apos;t have any active discounts at the moment. Check
            back soon — new deals drop regularly.
          </p>

          <Link
            href="/"
            className="mt-8 inline-block cursor-pointer rounded-lg bg-[#7c5cff] px-6 py-3 font-semibold transition-colors hover:bg-[#6a45ff]"
          >
            Browse Games
          </Link>
        </div>
      </section>
    </main>
  );
}
