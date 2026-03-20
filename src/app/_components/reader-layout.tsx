"use client";

import { BibleReader } from "~/components/bible-reader";
import { SidebarNav } from "~/components/sidebar-nav";
import { SearchDialog } from "~/components/search-dialog";
import { LiturgicalNavigator } from "~/components/liturgical-navigator";

export function ReaderLayout() {
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
      <LiturgicalNavigator />
    </main>
  );
}
