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
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 opacity-40">
          <Library className="h-2.5 w-2.5" />
          <span className="text-[8px] font-black uppercase tracking-[0.3em]">Codex</span>
        </div>
      </div>

      {/* Jerusalem Compact Segmented Control */}
      <div className="relative flex p-1 bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
        {/* Animated Slider */}
        <div className="absolute inset-1 flex pointer-events-none">
          <motion.div
            layoutId="jerusalem-slider"
            className="h-full bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200/20 dark:border-zinc-700/20"
            initial={false}
            animate={{
              width: `${100 / translations.length}%`,
              x: `${translations.findIndex(t => t.slug === translationSlug) * 100}%`
            }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          />
        </div>

        {translations.map((t) => {
          const isActive = translationSlug === t.slug;
          return (
            <button
              key={t.slug}
              onClick={() => handleSwitch(t.slug)}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center py-2 z-10 outline-none transition-colors duration-500",
                isActive ? "text-primary" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
            >
              <div className="flex items-center gap-1.5">
                {t.lang === "LA" ? (
                  <Globe className={cn("h-3 w-3", isActive && "animate-pulse")} />
                ) : (
                  <Languages className="h-3 w-3" />
                )}
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                  {t.abbreviation}
                </span>
              </div>
              <span className={cn(
                "text-[6px] font-bold uppercase tracking-tighter mt-0.5 opacity-60",
                isActive ? "text-primary" : "text-zinc-400"
              )}>
                {t.desc}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Aesthetic Stone-Line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent opacity-50" />
    </div>
  );
}
