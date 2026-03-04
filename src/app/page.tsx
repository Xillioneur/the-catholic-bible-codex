import { HydrateClient } from "~/trpc/server";
import { ReaderLayout } from "~/app/_components/reader-layout";

export default async function Home() {
  return (
    <HydrateClient>
      <ReaderLayout />
    </HydrateClient>
  );
}
