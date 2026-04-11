"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Globe, Languages, Library } from "lucide-react";
import { useReaderStore } from "~/hooks/use-reader-store";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

const CORE_TRANSLATIONS = [
  { id: "drb", slug: "drb", abbreviation: "DRB", name: "Douay-Rheims", lang: "EN", desc: "Classic" },
  { id: "webbe", slug: "webbe", abbreviation: "WEB", name: "World English", lang: "EN", desc: "Modern" },
  { id: "vul", slug: "vul", abbreviation: "VUL", name: "Latin Vulgate", lang: "LA", desc: "Sacred" },
];

export function TranslationSwitcher() {
  const { data: dbTranslations } = api.bible.getTranslations.useQuery();
  const translationSlug = useReaderStore((state) => state.translationSlug);
  const setTranslationSlug = useReaderStore((state) => state.setTranslationSlug);

  const translations = React.useMemo(() => {
    const base = [...CORE_TRANSLATIONS];
    if (!dbTranslations) return base;

    const existingSlugs = new Set(base.map((t) => t.slug));
    dbTranslations.forEach((t) => {
      if (!existingSlugs.has(t.slug)) {
        base.push({
          id: t.id,
          slug: t.slug,
          abbreviation: t.abbreviation.slice(0, 3).toUpperCase(),
          name: t.name,
          lang: t.language === "la" ? "LA" : "EN",
          desc: "Extra",
        });
      }
    });
    return base.slice(0, 3); // Keep it ultra-compact with just the core 3
  }, [dbTranslations]);

  const handleSwitch = (slug: string) => {
    if (slug === translationSlug) return;
    setTranslationSlug(slug);
    const name = translations.find(t => t.slug === slug)?.name;
    toast.success(`${name}`, {
      description: "Hydrating Sacred Text",
      duration: 1500,
    });
  };

  return (
    <div className="w-full flex flex-col">
      {/* Jerusalem Ultra-Compact Segmented Control */}
      <div className="relative flex p-0.5 bg-zinc-100/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-lg border border-zinc-200/30 dark:border-zinc-800/30">
        {/* Animated Slider */}
        <div className="absolute inset-0.5 flex pointer-events-none">
          <motion.div
            layoutId="jerusalem-slider"
            className="h-full bg-white dark:bg-zinc-800 rounded-md shadow-sm border border-zinc-200/10 dark:border-zinc-700/10"
            initial={false}
            animate={{
              width: `${100 / translations.length}%`,
              x: `${translations.findIndex(t => t.slug === translationSlug) * 100}%`
            }}
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
          />
        </div>

        {translations.map((t) => {
          const isActive = translationSlug === t.slug;
          return (
            <button
              key={t.slug}
              onClick={() => handleSwitch(t.slug)}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center py-1 z-10 outline-none transition-colors duration-500",
                isActive ? "text-primary" : "text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-300"
              )}
            >
              <div className="flex items-center gap-1">
                {t.lang === "LA" ? (
                  <Globe className={cn("h-2.5 w-2.5", isActive && "animate-pulse")} />
                ) : (
                  <Languages className="h-2.5 w-2.5" />
                )}
                <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                  {t.abbreviation}
                </span>
              </div>
              <span className={cn(
                "text-[5px] font-black uppercase tracking-tighter mt-0.5 opacity-50",
                isActive ? "text-primary" : "text-zinc-500"
              )}>
                {t.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
