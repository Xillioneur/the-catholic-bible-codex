"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { api } from "~/trpc/react";
import { type LiturgicalInfo, getLiturgicalColorOklch } from "~/lib/liturgical";
import { useReaderStore } from "~/hooks/use-reader-store";
import { db } from "~/lib/db";

interface LiturgicalContextType {
  info: LiturgicalInfo | null;
  isLoading: boolean;
  error: any;
}

const LiturgicalContext = createContext<LiturgicalContextType | undefined>(undefined);

export function LiturgicalProvider({ children }: { children: ReactNode }) {
  const liturgicalDate = useReaderStore((state) => state.liturgicalDate);
  const { data: info, isLoading, error } = api.bible.getLiturgicalInfo.useQuery(
    { date: liturgicalDate },
    { placeholderData: (prev) => prev } // Keep old data while loading new date
  );
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const theme = useReaderStore((state) => state.theme);
  const setLiturgicalReadings = useReaderStore((state) => state.setLiturgicalReadings);
  const utils = api.useUtils();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (info?.color) {
      const palette = getLiturgicalColorOklch(info.color);
      const root = document.documentElement;
      
      root.style.setProperty("--primary", `oklch(${palette.primary})`);
      root.style.setProperty("--primary-foreground", info.color === "white" || info.color === "gold" ? "oklch(0.2 0.02 85)" : "oklch(0.98 0.01 240)");
      root.style.setProperty("--ring", `oklch(${palette.primary} / 0.15)`);
      
      // Dynamic surface tinting for 'Sanctuary' feel
      root.style.setProperty("--liturgical-surface", `oklch(${palette.surface})`);
      root.style.setProperty("--liturgical-foreground", `oklch(${palette.foreground})`);
    }
  }, [info]);

  useEffect(() => {
    if (!info) return;

    const resolveAll = async () => {
      try {
        const readingPairs = [
          { type: "First Reading", citation: info.readings.firstReading },
          { type: "Responsorial Psalm", citation: info.readings.psalm },
          { type: "Second Reading", citation: info.readings.secondReading },
          { type: "Sequence", citation: info.readings.sequence },
          { type: "Alleluia", citation: info.readings.alleluia || info.readings.verseBeforeGospel },
          { type: "The Holy Gospel", citation: info.readings.gospel }
        ].filter(p => !!p.citation) as { type: string; citation: string }[];

        // 1. SINGLE BATCH CALL for all orders
        const resolvedOrders = await utils.bible.resolveBatchReadings.fetch({
          translationSlug,
          readings: readingPairs
        });

        // 2. OPTIMIZED DEXIE FETCH
        // Collect all unique globalOrders across all readings to fetch from IndexedDB in one go
        const allOrders = resolvedOrders.filter(Boolean).flatMap(r => r!.orders);
        
        // Use Dexie's 'anyOf' for efficient multi-key lookup
        const allVerses = await db.verses
          .where("translationId").equals(translationSlug)
          .and(v => allOrders.includes(v.globalOrder))
          .toArray();

        // 3. MAP BACK TO READINGS (and maintain original liturgical order)
        const finalReadings = readingPairs.map(p => {
          const resolved = resolvedOrders.find(ro => ro?.type === p.type);
          if (!resolved) return null;

          const readingVerses = allVerses
            .filter(v => resolved.orders.includes(v.globalOrder))
            .sort((a, b) => a.globalOrder - b.globalOrder);
            
          // Find original reading info to get heading
          const original = readingPairs.find(rp => rp.type === p.type);
          const heading = original?.type === "First Reading" ? info.readings.firstReadingHeading :
                        original?.type === "Second Reading" ? info.readings.secondReadingHeading :
                        original?.type === "The Holy Gospel" ? info.readings.gospelHeading : undefined;

          const sequenceText = original?.type === "Sequence" ? info.readings.sequenceText : undefined;

          return {
            ...resolved,
            verses: readingVerses,
            heading,
            sequenceText
          };
        }).filter(Boolean);

        setLiturgicalReadings(finalReadings as any);
      } catch (e) {
        console.error(`[LITURGICAL] Batch resolution failed`, e);
      }
    };

    void resolveAll();
  }, [info, translationSlug, utils, setLiturgicalReadings]);

  return (
    <LiturgicalContext.Provider value={{ info: info ?? null, isLoading, error }}>
      {children}
    </LiturgicalContext.Provider>
  );
}

export function useLiturgical() {
  const context = useContext(LiturgicalContext);
  if (context === undefined) {
    throw new Error("useLiturgical must be used within a LiturgicalProvider");
  }
  return context;
}
