"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { Provider } from "react-redux";
import { initializeStore } from "@/redux/store";

// Load all overrides.
// TODO: Putting this here as this seems to the most top level component used with "use client"
import "./solid-extensions";

export function GlobalProvider({ children, entities }: { children: React.ReactNode, entities: string[] }) {
  const store = initializeStore(entities);

  return (
    <>
      <Toaster />
      <Provider store={store}>
        <SessionProvider>{children}</SessionProvider>
      </Provider>
    </>
  );
}
