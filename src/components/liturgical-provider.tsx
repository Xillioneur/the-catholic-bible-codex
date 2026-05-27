"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { api } from "~/trpc/react";
import { type LiturgicalInfo, getLiturgicalColorOklch } from "~/lib/liturgical";
import { useReaderStore } from "~/hooks/use-reader-store";

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
  const hasHydrated = useReaderStore((state) => state.hasHydrated);
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
    if (!info || !hasHydrated) return;

    const resolveAll = async () => {
      try {
        if (!utils?.bible?.resolveBatchReadings || !utils?.bible?.getVersesByOrderRange) return;

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

        if (!resolvedOrders) return;

        // 2. FETCH VERSES FROM SERVER (HYDRATION REMOVAL)
        const allOrders = resolvedOrders.filter(Boolean).flatMap(r => r?.orders ?? []);
        if (allOrders.length === 0) {
          setLiturgicalReadings([]);
          return;
        }

        const startOrder = Math.min(...allOrders);
        const endOrder = Math.max(...allOrders);

        // Fetch the entire range that covers all liturgical readings for the day
        const allVerses = await utils.bible.getVersesByOrderRange.fetch({
          translationSlug,
          startOrder,
          endOrder
        });

        if (!allVerses) return;

        // 3. MAP BACK TO READINGS (and maintain original liturgical order)
        const finalReadings = readingPairs.map(p => {
          const resolved = resolvedOrders.find(ro => ro?.type === p.type);
          if (!resolved || !resolved.orders) return null;

          const readingVerses = allVerses
            .filter(v => resolved.orders.includes(v.globalOrder))
            .sort((a, b) => a.globalOrder - b.globalOrder);
            
          // Find original reading info to get heading
          const heading = p.type === "First Reading" ? info.readings.firstReadingHeading :
                         p.type === "Second Reading" ? info.readings.secondReadingHeading :
                         p.type === "The Holy Gospel" ? info.readings.gospelHeading : undefined;

          const sequenceText = p.type === "Sequence" ? info.readings.sequenceText : undefined;

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
  }, [info?.day, info?.season, translationSlug, setLiturgicalReadings]);

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
