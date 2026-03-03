"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getCurrentLiturgicalInfo, getLiturgicalColorOklch, type LiturgicalInfo } from "~/lib/liturgical";

const LiturgicalContext = createContext<LiturgicalInfo | null>(null);

export function LiturgicalProvider({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<LiturgicalInfo>(getCurrentLiturgicalInfo());

  useEffect(() => {
    // Update CSS variables based on liturgical color
    const oklch = getLiturgicalColorOklch(info.color);
    document.documentElement.style.setProperty("--primary", `oklch(${oklch})`);
    
    // For violet season, we might want to adjust the background slightly too
    if (info.color === "violet") {
       document.documentElement.style.setProperty("--background", `oklch(0.98 0.01 285)`);
    } else {
       document.documentElement.style.setProperty("--background", `oklch(0.99 0.002 240)`);
    }
  }, [info]);

  return (
    <LiturgicalContext.Provider value={info}>
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
