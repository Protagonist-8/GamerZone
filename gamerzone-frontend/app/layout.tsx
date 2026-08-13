import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

import { CartProvider } from "@/app/context/CartContext";
import CursorFX from "@/app/components/CursorFX";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GamerZone — Play Beyond Limits",
  description:
    "Browse games, grab the best price across every platform, and build your library on GamerZone.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable}`}
      >
        <CartProvider>
          <CursorFX />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}