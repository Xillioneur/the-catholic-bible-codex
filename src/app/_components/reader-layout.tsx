"use client";

import { BibleReader } from "~/components/bible-reader";
import { SidebarNav } from "~/components/sidebar-nav";
import { SearchDialog } from "~/components/search-dialog";
import { LiturgicalNavigator } from "~/components/liturgical-navigator";
import { JourneyGuide } from "~/components/journey-guide";
import { VoiceoverPlayer } from "~/components/voiceover-player";
import { VoiceoverManager } from "~/components/voiceover-manager";
import { ReaderHeader } from "~/components/reader-header";
import { useReaderStore } from "~/hooks/use-reader-store";

export function ReaderLayout() {
  const currentOrder = useReaderStore((state) => state.currentOrder);

  return (
    <main className="flex h-screen bg-background overflow-hidden relative">
      {/* The Floating Sidebar */}
      <SidebarNav />

      {/* Centered Reader Area */}
      <div className="flex-1 h-full overflow-hidden">
        <div className="h-full w-full max-w-5xl mx-auto px-4 sm:px-8 relative">
          <BibleReader />
        </div>
      </div>

      <SearchDialog />
      <LiturgicalNavigator />
      <JourneyGuide currentOrder={currentOrder} />
      <VoiceoverPlayer />
      <VoiceoverManager />
    </main>
  );
}
