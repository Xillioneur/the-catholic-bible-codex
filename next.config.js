/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import { withSerwist } from "@serwist/turbopack";

/** @type {import("next").NextConfig} */
const config = {
  // Turbopack is supported by Serwist 9.5.6+
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withSerwist(config);
