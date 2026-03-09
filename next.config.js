import "./src/env.js";
import { withSerwist } from "@serwist/turbopack";

/** @type {import("next").NextConfig} */
const config = {
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withSerwist(config, {
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB
});
