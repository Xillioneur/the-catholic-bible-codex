"use client";

import React, { createContext, useContext, useEffect } from "react";
import { getLiturgicalColorOklch, type LiturgicalInfo } from "~/lib/liturgical";
import { api } from "~/trpc/react";

const LiturgicalContext = createContext<{ 
  info: LiturgicalInfo | null; 
  isLoading: boolean;
  error: boolean;
} | null>(null);

export function LiturgicalProvider({ children }: { children: React.ReactNode }) {
  const { data: info, isLoading, isError } = api.bible.getLiturgicalInfo.useQuery(
    { date: null },
    {
      staleTime: 1000 * 60 * 60, // 1 hour
      retry: 3,
    }
  );

  useEffect(() => {
    if (info) {
      const oklch = getLiturgicalColorOklch(info.color);
      document.documentElement.style.setProperty("--primary", `oklch(${oklch})`);
      
      if (info.color === "violet") {
         document.documentElement.style.setProperty("--background", `oklch(0.98 0.01 285)`);
      } else {
         document.documentElement.style.setProperty("--background", `oklch(0.99 0.002 240)`);
      }
    }
  }, [info]);

  return (
    <LiturgicalContext.Provider value={{ info: info ?? null, isLoading, error: isError }}>
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
