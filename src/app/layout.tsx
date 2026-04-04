import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist, Ibarra_Real_Nova } from "next/font/google";
import { SessionProvider } from "next-auth/react";

import { TRPCReactProvider } from "~/trpc/react";
import { LiturgicalProvider } from "~/components/liturgical-provider";
import { Toaster } from "~/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { ProgressSyncer } from "./_components/progress-syncer";

export const metadata: Metadata = {
  title: "The Catholic Bible Codex – Read, Study, and Pray with the Full Catholic Bible",
  description: "Experience the Sacred Scriptures in a modern, ultra-fast PWA. Featuring the full 73-book canon, daily Mass readings, patristic commentary, and offline-first study tools.",
  metadataBase: new URL("https://the-catholic-bible-codex.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "The Catholic Bible Codex – The Premium Catholic Scripture Experience",
    description: "Immerse yourself in the Word of God with a digital sanctuary designed for the faithful. 100% offline-first with World English Bible (Catholic Edition), Douay-Rheims, and Latin Vulgate.",
    url: "https://the-catholic-bible-codex.vercel.app",
    siteName: "The Catholic Bible Codex",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Catholic Bible Codex – Modern Catholic Bible PWA",
    description: "Immersive, offline-first Catholic Scripture experience with daily Mass readings.",
    creator: "@liwawil",
  },
  icons: [
    { rel: "icon", url: "/favicon.svg", type: "image/svg+xml" },
    { rel: "apple-touch-icon", url: "/favicon.svg" },
  ],
  verification: {
    google: "google8b83b6c38622a440",
  },
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const ibarra = Ibarra_Real_Nova({
  subsets: ["latin"],
  variable: "--font-ibarra",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${ibarra.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SessionProvider>
          <TRPCReactProvider>
            <LiturgicalProvider>
              {children}
              <ProgressSyncer />
              <Toaster position="top-center" richColors />
              <Analytics />
            </LiturgicalProvider>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
