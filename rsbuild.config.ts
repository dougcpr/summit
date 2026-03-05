import { defineConfig, loadEnv } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { TanStackRouterRspack } from "@tanstack/router-plugin/rspack";

const { publicVars } = loadEnv({ prefixes: ["VITE_"] });

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: "./src/index.tsx",
    },
    define: publicVars,
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
