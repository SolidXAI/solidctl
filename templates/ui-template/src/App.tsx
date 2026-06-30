import "@solidxai/core-ui";

import { BrowserRouter } from "react-router-dom";
import { LayoutProvider, SolidThemeProvider, SolidFaviconProvider, StoreProvider, AppEventListener } from "@solidxai/core-ui";

import { AppRoutes } from "./AppRoutes";
import { solidUiModuleRuntime } from "./solid-ui-modules";
import "./index.css";

function App() {
  return (
    <BrowserRouter>
      <StoreProvider reducers={solidUiModuleRuntime.reducers} middlewares={solidUiModuleRuntime.middlewares}>
          <LayoutProvider>
            <SolidThemeProvider />
            <SolidFaviconProvider />
            <AppEventListener />
            <AppRoutes />
          </LayoutProvider>
      </StoreProvider>
    </BrowserRouter>
  );
}

export default App;
