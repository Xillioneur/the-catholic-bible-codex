import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Catholic Bible Codex – The Catholic Bible",
    short_name: "Verbum Domini",
    description: "A premium, modern Progressive Web Application for reading, studying, and praying with the full Catholic Bible (73-book canon).",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1e3a8a", // Catholic Blue
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
