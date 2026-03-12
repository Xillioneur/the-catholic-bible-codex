import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, StaleWhileRevalidate, CacheFirst, NetworkFirst } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (string | PrecacheEntry)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Cache Google Fonts (CSS)
      matcher: ({ url }) => url.origin === "https://fonts.googleapis.com",
      handler: new StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
      }),
    },
    {
      // Cache Google Fonts (Woff2)
      matcher: ({ url }) => url.origin === "https://fonts.gstatic.com",
      handler: new CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              if (response && response.status === 200) return response;
              return null;
            },
          },
        ],
      }),
    },
    {
      // Cache Bible JSON data files (the source of truth for offline)
      matcher: ({ url }) => url.pathname.startsWith("/data/") && url.pathname.endsWith(".json"),
      handler: new CacheFirst({
        cacheName: "bible-raw-data",
      }),
    },
    {
      // Cache Bible data (tRPC) - Fallback for when data isn't in Dexie yet
      matcher: ({ url }) => url.pathname.startsWith("/api/trpc/bible"),
      handler: new StaleWhileRevalidate({
        cacheName: "bible-trpc-data",
      }),
    },
    {
      // Navigation requests (the actual HTML)
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "navigations",
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              if (response && response.status === 200) return response;
              return null;
            },
          },
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
