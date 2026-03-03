"use client";

import React, { createContext, useContext, useEffect } from "react";
import { getLiturgicalColorOklch, type LiturgicalInfo } from "~/lib/liturgical";
import { api } from "~/trpc/react";

const LiturgicalContext = createContext<LiturgicalInfo | null>(null);

const DEFAULT_INFO: LiturgicalInfo = {
  season: "Ordinary Time",
  color: "green",
  day: "Weekday",
  readings: {
    firstReading: "Gen 1:1-5",
    gospel: "Jn 1:1-5"
  }
};

export function LiturgicalProvider({ children }: { children: React.ReactNode }) {
  const { data: info } = api.bible.getLiturgicalInfo.useQuery(
    { date: new Date() },
    {
      staleTime: 1000 * 60 * 60, // 1 hour
    }
  );

  const currentInfo = info ?? DEFAULT_INFO;

  useEffect(() => {
    // Update CSS variables based on liturgical color
    const oklch = getLiturgicalColorOklch(currentInfo.color);
    document.documentElement.style.setProperty("--primary", `oklch(${oklch})`);
    
    if (currentInfo.color === "violet") {
       document.documentElement.style.setProperty("--background", `oklch(0.98 0.01 285)`);
    } else {
       document.documentElement.style.setProperty("--background", `oklch(0.99 0.002 240)`);
    }
  }, [currentInfo]);

  return (
    <LiturgicalContext.Provider value={currentInfo}>
      {children}
    </LiturgicalContext.Provider>
  );
}

export const useLiturgical = () => {
  const context = useContext(LiturgicalContext);
  if (!context) {
    throw new Error("useLiturgical must be used within a LiturgicalProvider");
  }
  return context;
};
