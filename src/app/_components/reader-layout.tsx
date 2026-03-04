"use client";

import { BibleReader } from "~/components/bible-reader";
import { ReaderHeader } from "~/components/reader-header";
import { SearchDialog } from "~/components/search-dialog";
import { useReaderStore } from "~/hooks/use-reader-store";

export function ReaderLayout() {
  const jumpId = useReaderStore((state) => (state as any).jumpId);

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <ReaderHeader />
      <div className="flex-1 min-h-0">
        <BibleReader key={jumpId} />
      </div>
      <SearchDialog />
    </main>
  );
}

