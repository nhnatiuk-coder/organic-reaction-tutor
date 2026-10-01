// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "node:url";

const browserPolyfills = {
  name: "ketcher-browser-polyfills",
  enforce: "pre" as const,
  resolveId(id: string) {
    const replacements: Record<string, string> = {
      util: "./node_modules/util/util.js",
      "util/": "./node_modules/util/util.js",
      "node:util": "./node_modules/util/util.js",
      "node:util/": "./node_modules/util/util.js",
      assert: "./node_modules/assert/build/assert.js",
      "node:assert": "./node_modules/assert/build/assert.js",
    };

    const replacement = replacements[id];
    return replacement
      ? fileURLToPath(new URL(replacement, import.meta.url))
      : null;
  },
};

export default defineConfig({
  plugins: [browserPolyfills],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // The Ketcher structure editor expects the Node-style `global` in the browser.
    define: { global: "globalThis" },
  },
});
