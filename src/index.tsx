import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { ClerkProvider, SignIn, useAuth } from "@clerk/clerk-react";
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
