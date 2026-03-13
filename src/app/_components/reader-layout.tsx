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
      
      {/* Centered Reader Area - Now truly independent of sidebar state */}
      <div className="flex-1 h-full">
        <div className="max-w-5xl mx-auto h-full px-4 sm:px-8">
          <BibleReader />
        </div>
      </div>

      <SearchDialog />
    </main>
  );
}
