import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist, Ibarra_Real_Nova } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { LiturgicalProvider } from "~/components/liturgical-provider";
import { Toaster } from "~/components/ui/sonner";

export const metadata: Metadata = {
  title: "Catholic Bible Codex – The Catholic Bible",
  description: "A premium, modern Progressive Web Application for reading, studying, and praying with the full Catholic Bible (73-book canon).",
  metadataBase: new URL("https://catholic-bible-codex.vercel.app"), // Placeholder for user's domain
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Catholic Bible Codex",
    description: "The complete Catholic Bible in a modern, ultra-fast sanctuary for the Word of God.",
    url: "https://catholic-bible-codex.vercel.app",
    siteName: "Catholic Bible Codex",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Catholic Bible Codex",
    description: "Immersive, offline-first Catholic Scripture experience.",
    creator: "@Willie", // Using user's name as placeholder
  },
  icons: [
    { rel: "icon", url: "/favicon.svg", type: "image/svg+xml" },
    { rel: "apple-touch-icon", url: "/favicon.svg" },
  ],
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
        <TRPCReactProvider>
          <LiturgicalProvider>
            {children}
            <Toaster position="top-center" richColors />
          </LiturgicalProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
