# Summit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the Patchwork bouldering training app as Summit — using Convex, Clerk auth, TanStack Router, Rsbuild, Tailwind CSS v4, Recharts, and Framer Motion.

**Architecture:** Thin Client, Heavy Convex. All business logic (analytics, training zones, pyramid calculations) lives in Convex server functions. React is purely a rendering layer. Convex reactive queries auto-update the UI when data changes.

**Tech Stack:** React 19 + TypeScript, Rsbuild, pnpm, Convex, Clerk, TanStack Router, Tailwind CSS v4, Recharts, Framer Motion, Phosphor Icons, oxlint, oxfmt

---

## Task 1: Scaffold Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `rsbuild.config.ts`
- Create: `postcss.config.mjs`
- Create: `src/styles/globals.css`
- Create: `src/index.tsx`
- Create: `public/index.html`
- Create: `.oxlintrc.json`
- Create: `.oxfmtrc.json`
- Create: `.gitignore`

**Step 1: Initialize project**

```bash
cd /Users/dougcooper/Documents/Code/summit
pnpm init
```

**Step 2: Install core dependencies**

```bash
pnpm add react react-dom
pnpm add -D typescript @types/react @types/react-dom @types/node
pnpm add -D @rsbuild/core @rsbuild/plugin-react
pnpm add -D tailwindcss @tailwindcss/postcss
pnpm add -D oxlint
```

Note: oxfmt may not be published to npm yet. If `pnpm add -D oxfmt` fails, skip it and use oxlint only for now.

**Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "convex"]
}
```

**Step 4: Create `rsbuild.config.ts`**

```typescript
import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: "./src/index.tsx",
    },
  },
  html: {
    template: "./public/index.html",
  },
});
```

**Step 5: Create `postcss.config.mjs`**

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

**Step 6: Create `src/styles/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-primary: #e4c44d;
  --color-secondary: #d96c4f;
  --color-tertiary: #6a994e;
  --color-accent: #5995a3;
  --color-neutral-bg: #f6f1e3;
  --color-card-bg: #faf7f0;
  --color-border: #3b3b3b;
  --color-danger: #c44545;

  --font-family-display: "VT323", monospace;
}

@layer base {
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: var(--font-family-display);
    background-color: var(--color-neutral-bg);
    color: var(--color-border);
    min-height: 100dvh;
  }
}
```

**Step 7: Create `public/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Summit</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

**Step 8: Create `src/index.tsx`**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";

function App() {
  return <div className="p-4 font-display text-2xl">Summit</div>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

**Step 9: Create `.oxlintrc.json`**

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["import", "typescript", "react"],
  "categories": {
    "correctness": "error",
    "suspicious": "warn",
    "perf": "warn"
  },
  "rules": {
    "no-unused-vars": "error",
    "eqeqeq": "error"
  },
  "overrides": [
    {
      "files": ["*.test.ts", "*.test.tsx"],
      "rules": {
        "no-console": "off"
      }
    }
  ],
  "ignorePatterns": ["dist", "node_modules", "*.gen.ts", "convex/_generated"]
}
```

**Step 10: Create `.oxfmtrc.json`**

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "ignorePatterns": ["node_modules", "dist", "*.gen.ts", "convex/_generated"]
}
```

**Step 11: Create `.gitignore`**

```
node_modules/
dist/
.env
.env.local
*.gen.ts
```

**Step 12: Add scripts to `package.json`**

Add to `package.json`:
```json
{
  "type": "module",
  "scripts": {
    "dev": "rsbuild dev",
    "build": "rsbuild build",
    "preview": "rsbuild preview",
    "lint": "oxlint",
    "lint:fix": "oxlint --fix"
  }
}
```

**Step 13: Verify the app starts**

```bash
cd /Users/dougcooper/Documents/Code/summit
pnpm dev
```

Expected: Dev server starts, browser shows "Summit" in VT323 font on cream background.

**Step 14: Initialize git and commit**

```bash
cd /Users/dougcooper/Documents/Code/summit
git init
git add .
git commit -m "feat: scaffold summit project with rsbuild, tailwind, oxlint"
```

---

## Task 2: Set Up TanStack Router

**Files:**
- Modify: `package.json` (add dependency)
- Modify: `rsbuild.config.ts` (add router plugin)
- Create: `src/routes/__root.tsx`
- Create: `src/routes/log.tsx`
- Create: `src/routes/analytics.tsx`
- Modify: `src/index.tsx` (add router provider)

**Step 1: Install TanStack Router**

```bash
pnpm add @tanstack/react-router
pnpm add -D @tanstack/router-plugin
```

**Step 2: Update `rsbuild.config.ts` to add router plugin**

```typescript
import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { TanStackRouterRspack } from "@tanstack/router-plugin/rspack";

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: "./src/index.tsx",
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
```

**Step 3: Create `src/routes/__root.tsx`**

```typescript
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { PencilSimple, ChartBar } from "@phosphor-icons/react";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="flex flex-col min-h-dvh bg-neutral-bg">
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 flex border-t-2 border-border bg-card-bg">
        <Link
          to="/log"
          className="flex-1 flex flex-col items-center py-2 text-sm"
          activeProps={{ className: "text-primary" }}
          inactiveProps={{ className: "text-border/50" }}
        >
          <PencilSimple size={24} weight="bold" />
          <span>Log</span>
        </Link>
        <Link
          to="/analytics"
          className="flex-1 flex flex-col items-center py-2 text-sm"
          activeProps={{ className: "text-primary" }}
          inactiveProps={{ className: "text-border/50" }}
        >
          <ChartBar size={24} weight="bold" />
          <span>Analytics</span>
        </Link>
      </nav>
    </div>
  );
}
```

**Step 4: Create `src/routes/log.tsx`**

```typescript
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/log")({
  component: LogPage,
});

function LogPage() {
  return (
    <div className="p-4 font-display">
      <h1 className="text-3xl text-primary">Daily Log</h1>
      <p className="text-lg mt-2">Notes and climb logging will go here.</p>
    </div>
  );
}
```

**Step 5: Create `src/routes/analytics.tsx`**

```typescript
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <div className="p-4 font-display">
      <h1 className="text-3xl text-accent">Analytics</h1>
      <p className="text-lg mt-2">Charts and progress will go here.</p>
    </div>
  );
}
```

**Step 6: Install Phosphor Icons**

```bash
pnpm add @phosphor-icons/react
```

**Step 7: Update `src/index.tsx` with router**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./styles/globals.css";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
```

**Step 8: Create index redirect route `src/routes/index.tsx`**

```typescript
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/log" });
  },
});
```

**Step 9: Verify routing works**

```bash
pnpm dev
```

Expected: App shows bottom tab bar. Clicking "Log" shows the log page, clicking "Analytics" shows the analytics page. `/` redirects to `/log`.

**Step 10: Commit**

```bash
git add .
git commit -m "feat: add TanStack Router with bottom tab navigation"
```

---

## Task 3: Set Up Convex

**Files:**
- Create: `convex/schema.ts`
- Create: `convex/climbs.ts`
- Create: `convex/notes.ts`
- Modify: `src/index.tsx` (add Convex provider)
- Create: `src/env.d.ts`

**Step 1: Install Convex**

```bash
pnpm add convex
```

**Step 2: Initialize Convex (MANUAL STEP)**

> **User action required:** Run `npx convex dev` and follow the prompts to create a new Convex project. This will create the `convex/` directory and generate `convex/_generated/`. It will also create `.env.local` with `VITE_CONVEX_URL`. Since we're using Rsbuild (not Vite), we'll need to handle the env var differently — see Step 6.

**Step 3: Create `convex/schema.ts`**

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  climbs: defineTable({
    userId: v.string(),
    grade: v.string(),
    completed: v.boolean(),
    holdType: v.string(),
    climbedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "climbedAt"]),

  notes: defineTable({
    userId: v.string(),
    content: v.string(),
    date: v.string(),
  }).index("by_user_date", ["userId", "date"]),
});
```

**Step 4: Create `convex/climbs.ts`**

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByDate = query({
  args: {
    userId: v.string(),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).gte("climbedAt", args.startTime).lt("climbedAt", args.endTime),
      )
      .order("desc")
      .collect();
  },
});

export const getAll = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("climbs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    userId: v.string(),
    grade: v.string(),
    completed: v.boolean(),
    holdType: v.string(),
    climbedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("climbs", args);
  },
});

export const remove = mutation({
  args: { id: v.id("climbs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
```

**Step 5: Create `convex/notes.ts`**

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByDate = query({
  args: {
    userId: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notes")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    userId: v.string(),
    content: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { content: args.content });
    } else {
      await ctx.db.insert("notes", args);
    }
  },
});
```

**Step 6: Create `src/env.d.ts`**

Rsbuild uses `import.meta.env` but needs the env vars defined. Check `.env.local` — it likely has `VITE_CONVEX_URL`. Rsbuild can read env vars prefixed with `PUBLIC_` by default. Rename the var or configure Rsbuild:

Update `rsbuild.config.ts` to load the env var:

```typescript
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
```

Create `src/env.d.ts`:

```typescript
declare namespace NodeJS {
  interface ProcessEnv {
    VITE_CONVEX_URL: string;
    VITE_CLERK_PUBLISHABLE_KEY: string;
  }
}
```

**Step 7: Update `src/index.tsx` with Convex provider**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { routeTree } from "./routeTree.gen";
import "./styles/globals.css";

const convex = new ConvexReactClient(process.env.VITE_CONVEX_URL);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <RouterProvider router={router} />
    </ConvexProvider>
  </React.StrictMode>,
);
```

**Step 8: Verify Convex connects**

```bash
pnpm dev
```

In a separate terminal:
```bash
npx convex dev
```

Expected: No console errors. Convex dev sync running. Schema deployed.

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Convex backend with climbs and notes schema"
```

---

## Task 4: Set Up Clerk Authentication

**Files:**
- Modify: `src/index.tsx` (add Clerk provider)
- Create: `convex/auth.config.ts`
- Modify: `convex/climbs.ts` (use auth identity)
- Modify: `convex/notes.ts` (use auth identity)

**Step 1: Install Clerk**

```bash
pnpm add @clerk/clerk-react
```

**Step 2: Set up Clerk (MANUAL STEP)**

> **User action required:**
> 1. Create a Clerk application at https://dashboard.clerk.com
> 2. Get your publishable key
> 3. Add to `.env.local`:
>    ```
>    VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
>    ```
> 4. In Clerk Dashboard → JWT Templates → Create template → Choose "Convex"
> 5. Copy the Issuer URL
> 6. In Convex dashboard, set env var: `CLERK_JWT_ISSUER_DOMAIN=<issuer-url>`

**Step 3: Create `convex/auth.config.ts`**

```typescript
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
```

**Step 4: Update Convex functions to use auth**

Update `convex/climbs.ts` — replace `userId: v.string()` args with auth identity:

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function getUserId(ctx: { auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.tokenIdentifier;
}

export const getByDate = query({
  args: {
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    return await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("climbedAt", args.startTime).lt("climbedAt", args.endTime),
      )
      .order("desc")
      .collect();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    return await ctx.db
      .query("climbs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    grade: v.string(),
    completed: v.boolean(),
    holdType: v.string(),
    climbedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    return await ctx.db.insert("climbs", { ...args, userId });
  },
});

export const remove = mutation({
  args: { id: v.id("climbs") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const climb = await ctx.db.get(args.id);
    if (!climb || climb.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
```

Update `convex/notes.ts` similarly:

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function getUserId(ctx: { auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.tokenIdentifier;
}

export const getByDate = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    return await ctx.db
      .query("notes")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", args.date))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    content: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", args.date))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { content: args.content });
    } else {
      await ctx.db.insert("notes", { userId, ...args });
    }
  },
});
```

**Step 5: Update `src/index.tsx` with Clerk + Convex providers**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { ClerkProvider, SignIn, useAuth, useUser } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Authenticated, Unauthenticated, ConvexReactClient } from "convex/react";
import { routeTree } from "./routeTree.gen";
import "./styles/globals.css";

const convex = new ConvexReactClient(process.env.VITE_CONVEX_URL);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function AppContent() {
  return (
    <>
      <Authenticated>
        <RouterProvider router={router} />
      </Authenticated>
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-dvh bg-neutral-bg">
          <SignIn />
        </div>
      </Unauthenticated>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={process.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <AppContent />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </React.StrictMode>,
);
```

**Step 6: Verify auth works**

```bash
pnpm dev
```

Expected: App shows Clerk sign-in page. After signing in, shows the tab bar and log page.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Clerk authentication with Convex integration"
```

---

## Task 5: Utility Libraries (Grades & Dates)

**Files:**
- Create: `src/lib/grades.ts`
- Create: `src/lib/dates.ts`

**Step 1: Create `src/lib/grades.ts`**

```typescript
export const GRADES = ["V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10"] as const;
export type Grade = (typeof GRADES)[number];

export const colorMap: Record<string, string> = {
  V0: "rgba(106, 153, 78, 0.8)",
  V1: "rgba(217, 108, 79, 0.8)",
  V2: "rgba(228, 196, 77, 0.8)",
  V3: "rgba(89, 149, 163, 0.8)",
  V4: "rgba(59, 59, 59, 0.8)",
  V5: "rgba(78, 104, 168, 0.8)",
  V6: "rgba(133, 94, 152, 0.8)",
  V7: "rgba(179, 84, 57, 0.8)",
  V8: "rgba(72, 111, 77, 0.8)",
  V9: "rgba(212, 136, 132, 0.8)",
  V10: "rgba(100, 100, 100, 0.8)",
};

export const fadedColorMap: Record<string, string> = Object.fromEntries(
  Object.entries(colorMap).map(([k, v]) => [k, v.replace("0.8)", "0.3)")]),
);

export function gradeIndex(grade: string): number {
  return GRADES.indexOf(grade as Grade);
}

export function gradeToNumber(grade: string): number | null {
  const match = grade.match(/^V(\d+)$/i);
  return match ? parseInt(match[1], 10) : null;
}

export type HoldType = "jug" | "crimp" | "sloper";

export const holdTypeConfig: Record<HoldType, { label: string; letter: string; color: string }> = {
  jug: { label: "Jug", letter: "J", color: "var(--color-primary)" },
  crimp: { label: "Crimp", letter: "C", color: "var(--color-secondary)" },
  sloper: { label: "Sloper", letter: "S", color: "var(--color-tertiary)" },
};
```

**Step 2: Create `src/lib/dates.ts`**

```typescript
export function getDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getLocalDayRange(date: Date): { startTime: number; endTime: number } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { startTime: start.getTime(), endTime: end.getTime() };
}

export function getStartOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function normalizeToNoon(date: Date): number {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d.getTime();
}

export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
```

**Step 3: Commit**

```bash
git add src/lib/
git commit -m "feat: add grade and date utility libraries"
```

---

## Task 6: Log Page — Note Editor

**Files:**
- Create: `src/components/log/note-editor.tsx`
- Modify: `src/routes/log.tsx`

**Step 1: Create `src/components/log/note-editor.tsx`**

```typescript
import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDateKey } from "../../lib/dates";

export function NoteEditor({ selectedDate }: { selectedDate: Date }) {
  const dateKey = getDateKey(selectedDate);
  const existingNote = useQuery(api.notes.getByDate, { date: dateKey });
  const upsertNote = useMutation(api.notes.upsert);

  const [content, setContent] = useState("");
  const lastSavedRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const noteContent = existingNote?.content ?? "";
    setContent(noteContent);
    lastSavedRef.current = noteContent;
  }, [existingNote]);

  const save = useCallback(
    (text: string) => {
      if (text !== lastSavedRef.current) {
        lastSavedRef.current = text;
        upsertNote({ content: text, date: dateKey });
      }
    },
    [dateKey, upsertNote],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(value), 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <textarea
      value={content}
      onChange={handleChange}
      placeholder="Enter notes here..."
      className="w-full min-h-32 p-3 font-display text-lg bg-card-bg border-2 border-border rounded-lg resize-y focus:outline-none focus:border-secondary"
    />
  );
}
```

**Step 2: Update `src/routes/log.tsx` to include note editor and date navigation**

```typescript
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { NoteEditor } from "../components/log/note-editor";
import { formatDisplayDate } from "../lib/dates";

export const Route = createFileRoute("/log")({
  component: LogPage,
});

function LogPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const goBack = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const goForward = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  return (
    <div className="p-4 font-display max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={goBack} className="p-2 active:brightness-90">
          <CaretLeft size={24} weight="bold" />
        </button>
        <span className="text-xl">{formatDisplayDate(selectedDate)}</span>
        <button onClick={goForward} className="p-2 active:brightness-90">
          <CaretRight size={24} weight="bold" />
        </button>
      </div>

      <NoteEditor selectedDate={selectedDate} />
    </div>
  );
}
```

**Step 3: Verify note editor works**

Expected: Textarea appears, typing auto-saves to Convex after 1 second pause.

**Step 4: Commit**

```bash
git add src/components/log/ src/routes/log.tsx
git commit -m "feat: add note editor with auto-save"
```

---

## Task 7: Log Page — Grade Selector, Hold Type Picker, Action Buttons

**Files:**
- Create: `src/components/log/grade-selector.tsx`
- Create: `src/components/log/hold-type-picker.tsx`
- Create: `src/components/log/action-buttons.tsx`
- Modify: `src/routes/log.tsx`

**Step 1: Create `src/components/log/grade-selector.tsx`**

```typescript
import { CaretUp, CaretDown } from "@phosphor-icons/react";
import { GRADES, colorMap } from "../../lib/grades";

interface GradeSelectorProps {
  grade: string;
  onChange: (grade: string) => void;
}

export function GradeSelector({ grade, onChange }: GradeSelectorProps) {
  const idx = GRADES.indexOf(grade as (typeof GRADES)[number]);

  const up = () => {
    if (idx < GRADES.length - 1) onChange(GRADES[idx + 1]);
  };

  const down = () => {
    if (idx > 0) onChange(GRADES[idx - 1]);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={up}
        disabled={idx >= GRADES.length - 1}
        className="p-1 disabled:opacity-30 active:brightness-90"
      >
        <CaretUp size={32} weight="bold" />
      </button>
      <span className="text-5xl font-display" style={{ color: colorMap[grade] }}>
        {grade}
      </span>
      <button
        onClick={down}
        disabled={idx <= 0}
        className="p-1 disabled:opacity-30 active:brightness-90"
      >
        <CaretDown size={32} weight="bold" />
      </button>
    </div>
  );
}
```

**Step 2: Create `src/components/log/hold-type-picker.tsx`**

```typescript
import { HandGrabbing, Hand, HandPalm } from "@phosphor-icons/react";
import type { HoldType } from "../../lib/grades";
import { holdTypeConfig } from "../../lib/grades";

interface HoldTypePickerProps {
  selected: HoldType;
  onChange: (type: HoldType) => void;
}

const icons: Record<HoldType, React.ElementType> = {
  jug: HandGrabbing,
  crimp: Hand,
  sloper: HandPalm,
};

export function HoldTypePicker({ selected, onChange }: HoldTypePickerProps) {
  return (
    <div className="flex gap-2">
      {(Object.keys(holdTypeConfig) as HoldType[]).map((type) => {
        const config = holdTypeConfig[type];
        const Icon = icons[type];
        const isSelected = selected === type;

        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border-2 border-border text-lg transition-opacity active:brightness-90"
            style={{
              opacity: isSelected ? 1 : 0.35,
              backgroundColor: isSelected ? config.color : "transparent",
              color: isSelected ? "white" : "inherit",
            }}
          >
            <Icon size={20} weight="bold" />
            {config.letter}
          </button>
        );
      })}
    </div>
  );
}
```

**Step 3: Create `src/components/log/action-buttons.tsx`**

```typescript
import { Plus, Check } from "@phosphor-icons/react";

interface ActionButtonsProps {
  onAttempt: () => void;
  onSend: () => void;
}

export function ActionButtons({ onAttempt, onSend }: ActionButtonsProps) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onAttempt}
        className="flex-1 flex items-center justify-center gap-2 py-3 bg-secondary text-white rounded-lg text-xl active:brightness-90"
      >
        <Plus size={24} weight="bold" />
        Attempt
      </button>
      <button
        onClick={onSend}
        className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-lg text-xl active:brightness-90"
      >
        <Check size={24} weight="bold" />
        Send
      </button>
    </div>
  );
}
```

**Step 4: Update `src/routes/log.tsx` to integrate all components**

```typescript
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { api } from "../convex/_generated/api";
import { NoteEditor } from "../components/log/note-editor";
import { GradeSelector } from "../components/log/grade-selector";
import { HoldTypePicker } from "../components/log/hold-type-picker";
import { ActionButtons } from "../components/log/action-buttons";
import { formatDisplayDate, normalizeToNoon } from "../lib/dates";
import type { HoldType } from "../lib/grades";

export const Route = createFileRoute("/log")({
  component: LogPage,
});

function LogPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [grade, setGrade] = useState("V0");
  const [holdType, setHoldType] = useState<HoldType>("jug");

  const addClimb = useMutation(api.climbs.add);

  const goBack = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const goForward = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const handleLog = (completed: boolean) => {
    addClimb({
      grade,
      completed,
      holdType,
      climbedAt: normalizeToNoon(selectedDate),
    });
  };

  return (
    <div className="p-4 font-display max-w-lg mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={goBack} className="p-2 active:brightness-90">
          <CaretLeft size={24} weight="bold" />
        </button>
        <span className="text-xl">{formatDisplayDate(selectedDate)}</span>
        <button onClick={goForward} className="p-2 active:brightness-90">
          <CaretRight size={24} weight="bold" />
        </button>
      </div>

      <NoteEditor selectedDate={selectedDate} />

      <div className="flex items-center justify-between">
        <GradeSelector grade={grade} onChange={setGrade} />
        <HoldTypePicker selected={holdType} onChange={setHoldType} />
      </div>

      <ActionButtons onAttempt={() => handleLog(false)} onSend={() => handleLog(true)} />
    </div>
  );
}
```

**Step 5: Verify climb logging works**

Expected: Select a grade, pick hold type, tap Send or Attempt. Check Convex dashboard to see data.

**Step 6: Commit**

```bash
git add src/components/log/ src/routes/log.tsx
git commit -m "feat: add grade selector, hold type picker, and action buttons"
```

---

## Task 8: Log Page — Today Summary & Climb List

**Files:**
- Create: `src/components/log/today-summary.tsx`
- Create: `src/components/log/climb-list.tsx`
- Modify: `src/routes/log.tsx`

**Step 1: Install Framer Motion**

```bash
pnpm add framer-motion
```

**Step 2: Create `src/components/log/today-summary.tsx`**

```typescript
import type { Doc } from "../../convex/_generated/dataModel";

interface TodaySummaryProps {
  climbs: Doc<"climbs">[];
}

export function TodaySummary({ climbs }: TodaySummaryProps) {
  const total = climbs.length;
  const sends = climbs.filter((c) => c.completed).length;
  const pct = total > 0 ? Math.round((sends / total) * 100) : 0;

  return (
    <div className="text-center py-2 px-4 border-2 border-border rounded-full font-display text-lg">
      {sends} / {total} ({pct}%)
    </div>
  );
}
```

**Step 3: Create `src/components/log/climb-list.tsx`**

```typescript
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { Trash } from "@phosphor-icons/react";
import { api } from "../../convex/_generated/api";
import { colorMap, holdTypeConfig } from "../../lib/grades";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { HoldType } from "../../lib/grades";

interface ClimbListProps {
  climbs: Doc<"climbs">[];
}

function ClimbListItem({ climb }: { climb: Doc<"climbs"> }) {
  const [dragX, setDragX] = useState(0);
  const removeClimb = useMutation(api.climbs.remove);
  const holdConfig = holdTypeConfig[climb.holdType as HoldType];

  const handleDelete = () => {
    removeClimb({ id: climb._id as Id<"climbs"> });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="relative overflow-hidden"
    >
      <div className="absolute right-0 top-0 bottom-0 flex items-center pr-3">
        <button onClick={handleDelete} className="p-2 text-danger">
          <Trash size={20} weight="bold" />
        </button>
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.1}
        onDrag={(_, info) => setDragX(info.offset.x)}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) handleDelete();
        }}
        className="flex items-center gap-3 p-3 bg-card-bg border-2 border-border rounded-lg cursor-grab active:cursor-grabbing"
        style={{
          borderLeftColor: climb.completed ? colorMap[climb.grade] : "var(--color-secondary)",
          borderLeftWidth: 4,
        }}
      >
        <span className="text-xl font-display" style={{ color: colorMap[climb.grade] }}>
          {climb.grade}
        </span>
        <span className="text-sm" style={{ color: holdConfig?.color }}>
          {holdConfig?.letter}
        </span>
        <span className="ml-auto text-sm opacity-60">{climb.completed ? "sent" : "attempt"}</span>
      </motion.div>
    </motion.div>
  );
}

export function ClimbList({ climbs }: ClimbListProps) {
  return (
    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
      <AnimatePresence mode="popLayout">
        {climbs.map((climb) => (
          <ClimbListItem key={climb._id} climb={climb} />
        ))}
      </AnimatePresence>
      {climbs.length === 0 && (
        <p className="text-center text-sm opacity-50 py-4">No climbs logged yet today.</p>
      )}
    </div>
  );
}
```

**Step 4: Update `src/routes/log.tsx` to add summary and list**

Add the useQuery for climbs and render TodaySummary + ClimbList below the action buttons:

```typescript
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { api } from "../convex/_generated/api";
import { NoteEditor } from "../components/log/note-editor";
import { GradeSelector } from "../components/log/grade-selector";
import { HoldTypePicker } from "../components/log/hold-type-picker";
import { ActionButtons } from "../components/log/action-buttons";
import { TodaySummary } from "../components/log/today-summary";
import { ClimbList } from "../components/log/climb-list";
import { formatDisplayDate, normalizeToNoon, getLocalDayRange } from "../lib/dates";
import type { HoldType } from "../lib/grades";

export const Route = createFileRoute("/log")({
  component: LogPage,
});

function LogPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [grade, setGrade] = useState("V0");
  const [holdType, setHoldType] = useState<HoldType>("jug");

  const addClimb = useMutation(api.climbs.add);
  const { startTime, endTime } = getLocalDayRange(selectedDate);
  const climbs = useQuery(api.climbs.getByDate, { startTime, endTime });

  const goBack = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const goForward = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const handleLog = (completed: boolean) => {
    addClimb({
      grade,
      completed,
      holdType,
      climbedAt: normalizeToNoon(selectedDate),
    });
  };

  return (
    <div className="p-4 font-display max-w-lg mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={goBack} className="p-2 active:brightness-90">
          <CaretLeft size={24} weight="bold" />
        </button>
        <span className="text-xl">{formatDisplayDate(selectedDate)}</span>
        <button onClick={goForward} className="p-2 active:brightness-90">
          <CaretRight size={24} weight="bold" />
        </button>
      </div>

      <NoteEditor selectedDate={selectedDate} />

      <div className="flex items-center justify-between">
        <GradeSelector grade={grade} onChange={setGrade} />
        <HoldTypePicker selected={holdType} onChange={setHoldType} />
      </div>

      <ActionButtons onAttempt={() => handleLog(false)} onSend={() => handleLog(true)} />

      {climbs && (
        <>
          <TodaySummary climbs={climbs} />
          <ClimbList climbs={climbs} />
        </>
      )}
    </div>
  );
}
```

**Step 5: Verify the full log page works**

Expected: Can log climbs, see summary update in real-time, see climb list with swipe-to-delete.

**Step 6: Commit**

```bash
git add src/components/log/ src/routes/log.tsx
git commit -m "feat: add today summary and climb list with swipe-to-delete"
```

---

## Task 9: Convex Analytics Server Functions

**Files:**
- Create: `convex/analytics.ts`

**Step 1: Create `convex/analytics.ts`**

This is the core of the "Heavy Convex" approach — all analytics computed server-side.

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

const GRADES = ["V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10"];

async function getUserId(ctx: { auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.tokenIdentifier;
}

function gradeIdx(grade: string): number {
  return GRADES.indexOf(grade);
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

// --- Pyramid ---

export const pyramid = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const goalIdx = gradeIdx(args.goalGrade);
    if (goalIdx < 0) return { rows: [], weeksRemaining: 0 };

    const sends = climbs.filter((c) => c.completed);
    const sendsByGrade: Record<string, number> = {};
    for (const s of sends) {
      sendsByGrade[s.grade] = (sendsByGrade[s.grade] || 0) + 1;
    }

    const projectIdx = goalIdx - 1;
    const buildMaxIdx = goalIdx - 2;
    const buildMinIdx = Math.max(0, goalIdx - 4);
    const warmupMaxIdx = Math.max(0, buildMinIdx - 1);

    type PyramidRow = { label: string; sends: number; color: string };
    const rows: PyramidRow[] = [];

    if (goalIdx >= 6) {
      // Combine warm-up
      let warmupSends = 0;
      for (let i = 0; i <= warmupMaxIdx; i++) {
        warmupSends += sendsByGrade[GRADES[i]] || 0;
      }
      rows.push({ label: `V0-${GRADES[warmupMaxIdx]}`, sends: warmupSends, color: "warm-up" });

      // Combine build-base
      let buildSends = 0;
      for (let i = buildMinIdx; i <= buildMaxIdx; i++) {
        buildSends += sendsByGrade[GRADES[i]] || 0;
      }
      rows.push({
        label: `${GRADES[buildMinIdx]}-${GRADES[buildMaxIdx]}`,
        sends: buildSends,
        color: "build-base",
      });

      // Project
      if (projectIdx >= 0) {
        rows.push({
          label: GRADES[projectIdx],
          sends: sendsByGrade[GRADES[projectIdx]] || 0,
          color: "project",
        });
      }

      // Reach (goal grade)
      rows.push({
        label: GRADES[goalIdx],
        sends: sendsByGrade[GRADES[goalIdx]] || 0,
        color: "reach",
      });
    } else {
      // Show individual grades up to goal
      for (let i = 0; i <= goalIdx; i++) {
        rows.push({
          label: GRADES[i],
          sends: sendsByGrade[GRADES[i]] || 0,
          color: GRADES[i],
        });
      }
    }

    // Weeks remaining (52-week cycle, rough estimate from first climb)
    let weeksRemaining = 52;
    if (climbs.length > 0) {
      const firstClimb = climbs.reduce((a, b) => (a.climbedAt < b.climbedAt ? a : b));
      const elapsed = Date.now() - firstClimb.climbedAt;
      const weeksElapsed = Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000));
      weeksRemaining = Math.max(0, 52 - weeksElapsed);
    }

    return { rows: rows.reverse(), weeksRemaining };
  },
});

// --- Heatmap Data ---

export const heatmapData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const byDay: Record<string, { sum: number; count: number }> = {};
    for (const c of climbs) {
      const d = new Date(c.climbedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const num = gradeIdx(c.grade);
      if (num >= 0) {
        if (!byDay[key]) byDay[key] = { sum: 0, count: 0 };
        byDay[key].sum += num;
        byDay[key].count += 1;
      }
    }

    return Object.entries(byDay).map(([date, { sum, count }]) => ({
      date,
      avg: sum / count,
      count,
    }));
  },
});

// --- Hold Type Breakdown (last 30 days) ---

export const holdTypeBreakdown = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("climbedAt", thirtyDaysAgo))
      .collect();

    const counts: Record<string, number> = { jug: 0, crimp: 0, sloper: 0 };
    for (const c of climbs) {
      if (c.holdType in counts) counts[c.holdType]++;
    }

    const total = climbs.length || 1;
    const types = Object.entries(counts).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / total) * 100),
    }));

    // Least climbed type
    const focus = types.reduce((a, b) => (a.count < b.count ? a : b));

    return { types, focus: focus.type };
  },
});

// --- Weekly Training Zones ---

export const weeklyZones = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const goalIdx = gradeIdx(args.goalGrade);
    if (goalIdx < 0) return { zones: [], todayZone: "" };

    const projectIdx = goalIdx - 1;
    const buildMaxIdx = goalIdx - 2;
    const buildMinIdx = Math.max(0, goalIdx - 4);
    const warmupMaxIdx = Math.max(0, buildMinIdx - 1);

    const weekStart = getStartOfWeek(new Date());

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("climbedAt", weekStart.getTime()),
      )
      .collect();

    function countZone(minIdx: number, maxIdx: number) {
      let sends = 0;
      let attempts = 0;
      for (const c of climbs) {
        const gi = gradeIdx(c.grade);
        if (gi >= minIdx && gi <= maxIdx) {
          if (c.completed) sends++;
          else attempts++;
        }
      }
      return { sends, attempts };
    }

    const warmUp = countZone(0, warmupMaxIdx);
    const buildBase = countZone(buildMinIdx, buildMaxIdx);
    const project = countZone(projectIdx, projectIdx);
    const reach = countZone(goalIdx, GRADES.length - 1);

    const zones = [
      {
        label: "Warm Up",
        grade: `V0-${GRADES[warmupMaxIdx]}`,
        target: 8,
        ...warmUp,
        color: "accent",
      },
      {
        label: "Build Base",
        grade: `${GRADES[buildMinIdx]}-${GRADES[buildMaxIdx]}`,
        target: 6,
        ...buildBase,
        color: "tertiary",
      },
      {
        label: "Project",
        grade: GRADES[projectIdx] || "—",
        target: 3,
        attemptTarget: 8,
        ...project,
        color: "secondary",
      },
      {
        label: "Reach",
        grade: `${GRADES[goalIdx]}+`,
        target: 1,
        attemptTarget: 6,
        ...reach,
        color: "primary",
      },
    ];

    // Today's suggested zone
    const dayOfWeek = new Date().getDay();
    const todayZone =
      dayOfWeek === 1 || dayOfWeek === 4
        ? "Project"
        : dayOfWeek === 3 || dayOfWeek === 6
          ? "Build Base"
          : dayOfWeek === 5
            ? "Reach"
            : "Build Base";

    return { zones, todayZone };
  },
});

// --- Send Rates (last 30 days) ---

export const sendRates = query({
  args: { goalGrade: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const goalIdx = gradeIdx(args.goalGrade);
    if (goalIdx < 0) return [];

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const projectIdx = goalIdx - 1;
    const buildMaxIdx = goalIdx - 2;
    const buildMinIdx = Math.max(0, goalIdx - 4);
    const warmupMaxIdx = Math.max(0, buildMinIdx - 1);

    const climbs = await ctx.db
      .query("climbs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("climbedAt", thirtyDaysAgo),
      )
      .collect();

    function rate(minIdx: number, maxIdx: number) {
      let sends = 0;
      let total = 0;
      for (const c of climbs) {
        const gi = gradeIdx(c.grade);
        if (gi >= minIdx && gi <= maxIdx) {
          total++;
          if (c.completed) sends++;
        }
      }
      return total > 0 ? Math.round((sends / total) * 100) : 0;
    }

    return [
      { zone: "Warm Up", actual: rate(0, warmupMaxIdx), expected: 95 },
      { zone: "Build Base", actual: rate(buildMinIdx, buildMaxIdx), expected: 90 },
      { zone: "Project", actual: rate(projectIdx, projectIdx), expected: 20 },
      { zone: "Reach", actual: rate(goalIdx, GRADES.length - 1), expected: 5 },
    ];
  },
});
```

**Step 2: Verify schema deploys**

With `npx convex dev` running, all functions should deploy without errors.

**Step 3: Commit**

```bash
git add convex/analytics.ts
git commit -m "feat: add server-computed analytics functions"
```

---

## Task 10: Analytics Page — Pyramid Visualization

**Files:**
- Create: `src/components/analytics/pyramid.tsx`
- Modify: `src/routes/analytics.tsx`

**Step 1: Install Recharts**

```bash
pnpm add recharts
```

**Step 2: Create `src/components/analytics/pyramid.tsx`**

```typescript
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { GRADES, gradeIndex } from "../../lib/grades";
import { CaretDown } from "@phosphor-icons/react";

const zoneColors: Record<string, string> = {
  "warm-up": "var(--color-accent)",
  "build-base": "var(--color-tertiary)",
  project: "var(--color-secondary)",
  reach: "var(--color-primary)",
};

export function Pyramid() {
  const [goalGrade, setGoalGrade] = useState(() => {
    return localStorage.getItem("summit-goal-grade") || "V5";
  });
  const [showDropdown, setShowDropdown] = useState(false);

  const data = useQuery(api.analytics.pyramid, { goalGrade });

  const handleSetGoal = (g: string) => {
    setGoalGrade(g);
    localStorage.setItem("summit-goal-grade", g);
    setShowDropdown(false);
  };

  if (!data) return null;

  const maxSends = Math.max(...data.rows.map((r) => r.sends), 1);

  return (
    <div className="border-2 border-border rounded-lg p-4 bg-card-bg">
      <div className="flex items-center justify-between mb-3">
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1 text-2xl font-display px-3 py-1 border-2 border-border rounded-full"
          >
            {goalGrade} <CaretDown size={16} weight="bold" />
          </button>
          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-card-bg border-2 border-border rounded-lg shadow-lg z-10">
              {GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => handleSetGoal(g)}
                  className="block w-full text-left px-4 py-2 text-lg hover:bg-neutral-bg font-display"
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative w-12 h-12">
          <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
            <circle cx="22" cy="22" r="20" fill="none" stroke="var(--color-border)" strokeWidth="3" opacity="0.2" />
            <circle
              cx="22"
              cy="22"
              r="20"
              fill="none"
              stroke="var(--color-tertiary)"
              strokeWidth="3"
              strokeDasharray={`${(1 - data.weeksRemaining / 52) * 125.6} 125.6`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-display">
            {data.weeksRemaining}w
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {data.rows.map((row) => {
          const width = Math.max(10, Math.sqrt(row.sends / maxSends) * 100);
          const color = zoneColors[row.color] || "var(--color-border)";
          return (
            <div key={row.label} className="flex items-center gap-2">
              <div
                className="h-8 rounded flex items-center px-2 text-white text-sm font-display transition-all"
                style={{ width: `${width}%`, backgroundColor: color, minWidth: "2rem" }}
              >
                {row.sends}
              </div>
              <span className="text-sm font-display whitespace-nowrap">{row.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 3: Update `src/routes/analytics.tsx`**

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { Pyramid } from "../components/analytics/pyramid";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <div className="p-4 font-display max-w-lg mx-auto flex flex-col gap-4">
      <Pyramid />
    </div>
  );
}
```

**Step 4: Verify pyramid renders**

Expected: Pyramid shows with goal selector dropdown and progress ring.

**Step 5: Commit**

```bash
git add src/components/analytics/ src/routes/analytics.tsx
git commit -m "feat: add pyramid visualization with goal selector"
```

---

## Task 11: Analytics Page — Activity Heatmap

**Files:**
- Create: `src/components/analytics/activity-heatmap.tsx`
- Modify: `src/routes/analytics.tsx`

**Step 1: Install heatmap library**

```bash
pnpm add @uiw/react-heat-map
```

**Step 2: Create `src/components/analytics/activity-heatmap.tsx`**

```typescript
import { useQuery } from "convex/react";
import HeatMap from "@uiw/react-heat-map";
import { api } from "../../convex/_generated/api";
import { colorMap } from "../../lib/grades";

export function ActivityHeatmap() {
  const data = useQuery(api.analytics.heatmapData);

  if (!data) return null;

  const heatData = data.map((d) => ({
    date: d.date,
    count: d.count,
  }));

  // Last 6 months
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  return (
    <div className="border-2 border-border rounded-lg p-4 bg-card-bg overflow-x-auto">
      <h3 className="text-lg mb-2">Activity</h3>
      <HeatMap
        value={heatData}
        width={500}
        startDate={startDate}
        endDate={endDate}
        rectSize={12}
        space={3}
        legendCellSize={0}
        style={{ color: "var(--color-border)" }}
        panelColors={{
          0: "#f6f1e3",
          1: colorMap.V0.replace("0.8)", "0.6)"),
          3: colorMap.V2.replace("0.8)", "0.7)"),
          5: colorMap.V4.replace("0.8)", "0.8)"),
          8: colorMap.V6.replace("0.8)", "0.9)"),
        }}
        rectProps={{ rx: 2 }}
      />
    </div>
  );
}
```

**Step 3: Add heatmap to analytics page**

Update `src/routes/analytics.tsx`:

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { Pyramid } from "../components/analytics/pyramid";
import { ActivityHeatmap } from "../components/analytics/activity-heatmap";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <div className="p-4 font-display max-w-lg mx-auto flex flex-col gap-4">
      <Pyramid />
      <ActivityHeatmap />
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/components/analytics/ src/routes/analytics.tsx
git commit -m "feat: add activity heatmap"
```

---

## Task 12: Analytics Page — Hold Type Ring & Weekly Zones

**Files:**
- Create: `src/components/analytics/hold-type-ring.tsx`
- Create: `src/components/analytics/weekly-zones.tsx`
- Modify: `src/routes/analytics.tsx`

**Step 1: Create `src/components/analytics/hold-type-ring.tsx`**

```typescript
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { holdTypeConfig } from "../../lib/grades";
import type { HoldType } from "../../lib/grades";

export function HoldTypeRing() {
  const data = useQuery(api.analytics.holdTypeBreakdown);

  if (!data) return null;

  const radius = 40;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="border-2 border-border rounded-lg p-4 bg-card-bg">
      <h3 className="text-lg mb-2">Hold Focus</h3>
      <div className="flex items-center justify-center">
        <div className="relative w-28 h-28">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {data.types.map((t) => {
              const dashLen = (t.percentage / 100) * circumference;
              const config = holdTypeConfig[t.type as HoldType];
              const segment = (
                <circle
                  key={t.type}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={config?.color || "#ccc"}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += dashLen;
              return segment;
            })}
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-display">
            {holdTypeConfig[data.focus as HoldType]?.letter}
          </span>
        </div>
        <div className="ml-4 flex flex-col gap-1 text-sm">
          {data.types.map((t) => {
            const config = holdTypeConfig[t.type as HoldType];
            return (
              <div key={t.type} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config?.color }} />
                <span>
                  {config?.label}: {t.percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create `src/components/analytics/weekly-zones.tsx`**

```typescript
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const colorVars: Record<string, string> = {
  accent: "var(--color-accent)",
  tertiary: "var(--color-tertiary)",
  secondary: "var(--color-secondary)",
  primary: "var(--color-primary)",
};

export function WeeklyZones({ goalGrade }: { goalGrade: string }) {
  const data = useQuery(api.analytics.weeklyZones, { goalGrade });

  if (!data) return null;

  return (
    <div className="border-2 border-border rounded-lg p-4 bg-card-bg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg">Weekly Zones</h3>
        <span className="text-sm px-2 py-1 border border-border rounded-full">
          Today: {data.todayZone}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {data.zones.map((zone) => {
          const sendPct = Math.min(100, (zone.sends / zone.target) * 100);
          const color = colorVars[zone.color] || "var(--color-border)";

          return (
            <div key={zone.label}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>
                  {zone.label}{" "}
                  <span className="opacity-50">({zone.grade})</span>
                </span>
                <span>
                  {zone.sends}/{zone.target}
                </span>
              </div>
              <div className="h-3 bg-neutral-bg rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${sendPct}%`, backgroundColor: color }}
                />
              </div>
              {zone.attemptTarget && (
                <div className="mt-1">
                  <div className="flex justify-end text-xs opacity-50">
                    attempts: {zone.attempts}/{zone.attemptTarget}
                  </div>
                  <div className="h-1.5 bg-neutral-bg rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all opacity-50"
                      style={{
                        width: `${Math.min(100, (zone.attempts / zone.attemptTarget) * 100)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 3: Update `src/routes/analytics.tsx`**

```typescript
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pyramid } from "../components/analytics/pyramid";
import { ActivityHeatmap } from "../components/analytics/activity-heatmap";
import { HoldTypeRing } from "../components/analytics/hold-type-ring";
import { WeeklyZones } from "../components/analytics/weekly-zones";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [goalGrade] = useState(() => localStorage.getItem("summit-goal-grade") || "V5");

  return (
    <div className="p-4 font-display max-w-lg mx-auto flex flex-col gap-4">
      <Pyramid />
      <ActivityHeatmap />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HoldTypeRing />
        <WeeklyZones goalGrade={goalGrade} />
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/components/analytics/ src/routes/analytics.tsx
git commit -m "feat: add hold type ring and weekly training zones"
```

---

## Task 13: Analytics Page — Send Rate Comparison

**Files:**
- Create: `src/components/analytics/send-rate.tsx`
- Modify: `src/routes/analytics.tsx`

**Step 1: Create `src/components/analytics/send-rate.tsx`**

```typescript
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function SendRate({ goalGrade }: { goalGrade: string }) {
  const data = useQuery(api.analytics.sendRates, { goalGrade });

  if (!data) return null;

  return (
    <div className="border-2 border-border rounded-lg p-4 bg-card-bg">
      <h3 className="text-lg mb-3">Send Rates (30d)</h3>
      <div className="flex flex-col gap-2">
        {data.map((row) => {
          const passing = row.actual >= row.expected;
          return (
            <div key={row.zone} className="flex items-center justify-between text-sm">
              <span>{row.zone}</span>
              <div className="flex items-center gap-2">
                <span className={passing ? "text-tertiary" : "text-secondary"} style={{ fontWeight: "bold" }}>
                  {row.actual}%
                </span>
                <span className="opacity-50">(&ge;{row.expected}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Add to analytics page**

Update `src/routes/analytics.tsx` — add `SendRate` import and render below the grid:

```typescript
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pyramid } from "../components/analytics/pyramid";
import { ActivityHeatmap } from "../components/analytics/activity-heatmap";
import { HoldTypeRing } from "../components/analytics/hold-type-ring";
import { WeeklyZones } from "../components/analytics/weekly-zones";
import { SendRate } from "../components/analytics/send-rate";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [goalGrade] = useState(() => localStorage.getItem("summit-goal-grade") || "V5");

  return (
    <div className="p-4 font-display max-w-lg mx-auto flex flex-col gap-4 pb-20">
      <Pyramid />
      <ActivityHeatmap />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HoldTypeRing />
        <WeeklyZones goalGrade={goalGrade} />
      </div>
      <SendRate goalGrade={goalGrade} />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/analytics/ src/routes/analytics.tsx
git commit -m "feat: add send rate comparison widget"
```

---

## Task 14: Sync Goal Grade Between Pages

**Files:**
- Modify: `src/components/analytics/pyramid.tsx`
- Modify: `src/routes/analytics.tsx`

The pyramid component manages `goalGrade` in localStorage. The analytics page needs to read it reactively for weekly zones and send rates.

**Step 1: Lift goal grade state to analytics page**

Update `src/components/analytics/pyramid.tsx` to accept `goalGrade` and `onGoalChange` as props instead of managing its own state:

Change the interface:
```typescript
interface PyramidProps {
  goalGrade: string;
  onGoalChange: (grade: string) => void;
}

export function Pyramid({ goalGrade, onGoalChange }: PyramidProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const data = useQuery(api.analytics.pyramid, { goalGrade });

  const handleSetGoal = (g: string) => {
    onGoalChange(g);
    setShowDropdown(false);
  };
  // ... rest stays the same
}
```

Update `src/routes/analytics.tsx`:

```typescript
function AnalyticsPage() {
  const [goalGrade, setGoalGrade] = useState(() => localStorage.getItem("summit-goal-grade") || "V5");

  const handleGoalChange = (g: string) => {
    setGoalGrade(g);
    localStorage.setItem("summit-goal-grade", g);
  };

  return (
    <div className="p-4 font-display max-w-lg mx-auto flex flex-col gap-4 pb-20">
      <Pyramid goalGrade={goalGrade} onGoalChange={handleGoalChange} />
      <ActivityHeatmap />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HoldTypeRing />
        <WeeklyZones goalGrade={goalGrade} />
      </div>
      <SendRate goalGrade={goalGrade} />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/analytics/pyramid.tsx src/routes/analytics.tsx
git commit -m "refactor: lift goal grade state to analytics page"
```

---

## Task 15: Mobile Responsiveness Polish

**Files:**
- Modify: `src/routes/__root.tsx`
- Modify: `src/styles/globals.css`

**Step 1: Ensure proper mobile viewport and responsive breakpoints**

Update `src/styles/globals.css` — add responsive utilities:

```css
@import "tailwindcss";

@theme {
  --color-primary: #e4c44d;
  --color-secondary: #d96c4f;
  --color-tertiary: #6a994e;
  --color-accent: #5995a3;
  --color-neutral-bg: #f6f1e3;
  --color-card-bg: #faf7f0;
  --color-border: #3b3b3b;
  --color-danger: #c44545;

  --font-family-display: "VT323", monospace;
}

@layer base {
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-tap-highlight-color: transparent;
  }

  body {
    font-family: var(--font-family-display);
    background-color: var(--color-neutral-bg);
    color: var(--color-border);
    min-height: 100dvh;
    overscroll-behavior: none;
  }

  input, textarea, select, button {
    font-family: inherit;
  }
}
```

**Step 2: Desktop sidebar variant for root layout**

Update `src/routes/__root.tsx`:

```typescript
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { PencilSimple, ChartBar } from "@phosphor-icons/react";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="flex flex-col md:flex-row min-h-dvh bg-neutral-bg">
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-16 border-r-2 border-border bg-card-bg items-center py-4 gap-4">
        <Link
          to="/log"
          className="flex flex-col items-center p-2 rounded-lg text-sm"
          activeProps={{ className: "text-primary bg-primary/10" }}
          inactiveProps={{ className: "text-border/50 hover:text-border" }}
        >
          <PencilSimple size={24} weight="bold" />
        </Link>
        <Link
          to="/analytics"
          className="flex flex-col items-center p-2 rounded-lg text-sm"
          activeProps={{ className: "text-primary bg-primary/10" }}
          inactiveProps={{ className: "text-border/50 hover:text-border" }}
        >
          <ChartBar size={24} weight="bold" />
        </Link>
      </nav>

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex border-t-2 border-border bg-card-bg">
        <Link
          to="/log"
          className="flex-1 flex flex-col items-center py-2 text-sm"
          activeProps={{ className: "text-primary" }}
          inactiveProps={{ className: "text-border/50" }}
        >
          <PencilSimple size={24} weight="bold" />
          <span>Log</span>
        </Link>
        <Link
          to="/analytics"
          className="flex-1 flex flex-col items-center py-2 text-sm"
          activeProps={{ className: "text-primary" }}
          inactiveProps={{ className: "text-border/50" }}
        >
          <ChartBar size={24} weight="bold" />
          <span>Analytics</span>
        </Link>
      </nav>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/routes/__root.tsx src/styles/globals.css
git commit -m "feat: add responsive layout with desktop sidebar and mobile tab bar"
```

---

## Task 16: Final Integration & Verification

**Step 1: Run the full app and verify**

```bash
pnpm dev
```

In separate terminal:
```bash
npx convex dev
```

**Verification checklist:**
- [ ] Sign in with Clerk
- [ ] Navigate between Log and Analytics tabs
- [ ] Log page: type notes, see auto-save
- [ ] Log page: select grade, pick hold type, tap Send and Attempt
- [ ] Log page: see today summary update in real-time
- [ ] Log page: see climb list, swipe to delete
- [ ] Log page: navigate dates with arrows
- [ ] Analytics: pyramid renders with goal selector
- [ ] Analytics: heatmap shows activity
- [ ] Analytics: hold type ring shows distribution
- [ ] Analytics: weekly zones show progress
- [ ] Analytics: send rates show comparison
- [ ] Responsive: works on mobile viewport (375px)
- [ ] Responsive: desktop shows sidebar navigation

**Step 2: Run linter**

```bash
pnpm lint
```

Fix any issues found.

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: fix lint issues and verify full integration"
```

---

## Data Migration Notes

To migrate existing data from Supabase to Convex:

1. Export climbs from Supabase: `SELECT * FROM climbs ORDER BY created_at`
2. Export notes from Supabase: `SELECT * FROM notes ORDER BY created_at`
3. Create a one-time Convex mutation to bulk-import:

```typescript
// convex/migration.ts (temporary file)
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const importClimbs = mutation({
  args: {
    climbs: v.array(
      v.object({
        grade: v.string(),
        completed: v.boolean(),
        holdType: v.string(),
        climbedAt: v.number(),
        userId: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const climb of args.climbs) {
      await ctx.db.insert("climbs", climb);
    }
  },
});

export const importNotes = mutation({
  args: {
    notes: v.array(
      v.object({
        content: v.string(),
        date: v.string(),
        userId: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const note of args.notes) {
      await ctx.db.insert("notes", note);
    }
  },
});
```

4. Call these mutations from the Convex dashboard or a script
5. Delete `convex/migration.ts` after import
