import path from "node:path";
import { defineConfig, loadEnv } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { TanStackRouterRspack } from "@tanstack/router-plugin/rspack";

const { publicVars } = loadEnv({ prefixes: ["VITE_"] });

// Merge Vercel's process.env vars (not in .env files) into define
const envDefine: Record<string, string> = { ...publicVars };
for (const key of Object.keys(process.env)) {
  if (key.startsWith("VITE_") && !envDefine[`process.env.${key}`]) {
    envDefine[`process.env.${key}`] = JSON.stringify(process.env[key]);
  }
}

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: "./src/index.tsx",
    },
    define: envDefine,
  },
  resolve: {
    alias: {
      "@convex": path.resolve(__dirname, "convex"),
    },
  },
  html: {
    template: "./public/index.html",
  },
  tools: {
    rspack: {
      plugins: [
        TanStackRouterRspack({
          target: "react",
          autoCodeSplitting: true,
        }),
      ],
    },
  },
});
