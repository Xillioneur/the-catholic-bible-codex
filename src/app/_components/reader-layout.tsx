"use client";

import { BibleReader } from "~/components/bible-reader";
import { SidebarNav } from "~/components/sidebar-nav";
import { SearchDialog } from "~/components/search-dialog";
import { useReaderStore } from "~/hooks/use-reader-store";
import { cn } from "~/lib/utils";

export function ReaderLayout() {
  const isCollapsed = useReaderStore((state) => state.isSidebarCollapsed);

  return (
    <main className="flex h-screen bg-background overflow-hidden relative">
      {/* The Floating Sidebar - Truly floating now */}
      <SidebarNav />
      
      {/* Centered Reader Area */}
      <div className={cn(
        "flex-1 h-full transition-all duration-700 ease-in-out",
        isCollapsed ? "pl-20" : "pl-72"
      )}>
        <div className="max-w-5xl mx-auto h-full">
          <BibleReader />
        </div>
      </div>

      <SearchDialog />
    </main>
  );
}
