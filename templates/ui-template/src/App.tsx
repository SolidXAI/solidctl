import "@solidxai/core-ui";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";

import { BrowserRouter } from "react-router-dom";
import { PrimeReactProvider } from "primereact/api";
import { LayoutProvider, SolidThemeProvider, StoreProvider, AppEventListener } from "@solidxai/core-ui";

import { AppRoutes } from "./AppRoutes";
import { solidUiModuleRuntime } from "./solid-ui-modules";
import "./index.css";
import { Toaster } from "sonner";

function App() {
  return (
    <BrowserRouter>
      <StoreProvider reducers={solidUiModuleRuntime.reducers} middlewares={solidUiModuleRuntime.middlewares}>
        <PrimeReactProvider>
          <LayoutProvider>
            <SolidThemeProvider />
            <AppEventListener />
            <AppRoutes />
            <Toaster position="top-center" richColors />
          </LayoutProvider>
        </PrimeReactProvider>
      </StoreProvider>
    </BrowserRouter>
  );
}

export default App;
