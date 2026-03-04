import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist, Ibarra_Real_Nova } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { LiturgicalProvider } from "~/components/liturgical-provider";
import { Toaster } from "~/components/ui/sonner";

export const metadata: Metadata = {
  title: "Catholic Bible Codex – The Catholic Bible",
  description: "A premium, modern Progressive Web Application for reading, studying, and praying with the full Catholic Bible (73-book canon).",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
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
