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
  const { data: info, isLoading, error } = api.bible.getLiturgicalInfo.useQuery({});
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const setLiturgicalReadings = useReaderStore((state) => state.setLiturgicalReadings);
  const utils = api.useUtils();

  useEffect(() => {
    if (info?.color) {
      const oklch = getLiturgicalColorOklch(info.color);
      document.documentElement.style.setProperty("--primary", `oklch(${oklch})`);
      document.documentElement.style.setProperty("--ring", `oklch(${oklch} / 0.1)`);
    }
  }, [info]);

  useEffect(() => {
    if (!info) return;

    const resolveAll = async () => {
      const readingPairs = [
        { type: "First Reading", citation: info.readings.firstReading },
        { type: "Responsorial Psalm", citation: info.readings.psalm },
        { type: "Second Reading", citation: info.readings.secondReading },
        { type: "Verse Before the Gospel", citation: info.readings.verseBeforeGospel },
        { type: "The Holy Gospel", citation: info.readings.gospel }
      ];

      const resolvedReadings = await Promise.all(
        readingPairs
          .filter(p => !!p.citation)
          .map(async (p) => {
            try {
              // 1. Resolve global orders
              const orders = await utils.bible.resolveReadingHighlight.fetch({
                translationSlug,
                citation: p.citation!
              });

              // 2. Pre-fetch full verse objects from local DB for instant UI
              const verses = await db.verses
                .where("translationId").equals(translationSlug)
                .and(v => orders.includes(v.globalOrder))
                .toArray();

              return { 
                type: p.type, 
                citation: p.citation!, 
                orders,
                verses: verses.sort((a, b) => a.globalOrder - b.globalOrder)
              };
            } catch (e) {
              console.error(`[LITURGICAL] Resolution failed for ${p.citation}`, e);
              return null;
            }
          })
      );

      setLiturgicalReadings(resolvedReadings.filter(r => r !== null) as any);
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
