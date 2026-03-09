import { useState, useEffect, useCallback, useRef } from "react";

export function useSearchWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [results, setResults] = useState<any[] | null>(null);
  const [total, setTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // We use a string path for the worker to avoid complex bundler issues in some environments,
    // but in Next.js App Router with Turbopack, we can usually just new Worker(new URL(...))
    workerRef.current = new Worker(new URL("../workers/search-worker.ts", import.meta.url));

    workerRef.current.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === "SEARCH_RESULTS") {
        setResults(payload.items);
        setTotal(payload.total);
        setIsSearching(false);
      } else if (type === "ERROR") {
        console.error("Search Worker Error:", payload);
        setIsSearching(false);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const search = useCallback((params: { 
    query: string, 
    translationSlug: string, 
    bookId?: number, 
    chapter?: number, 
    mode: string, 
    limit: number 
  }) => {
    if (!workerRef.current) return;
    setIsSearching(true);
    workerRef.current.postMessage({ type: "SEARCH", payload: params });
  }, []);

  return { search, results, total, isSearching };
}
