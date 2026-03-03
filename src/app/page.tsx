import { HydrateClient } from "~/trpc/server";
import { BibleReader } from "~/components/bible-reader";
import { ReaderHeader } from "~/components/reader-header";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="flex h-screen flex-col overflow-hidden">
        <ReaderHeader />
        <div className="flex-1 min-h-0">
          <BibleReader />
        </div>
      </main>
    </HydrateClient>
  );
}
