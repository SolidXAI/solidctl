import "@solidxai/core-ui";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";

import { useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { PrimeReactProvider } from "primereact/api";
import { LayoutProvider, SolidThemeProvider, StoreProvider, AppEventListener } from "@solidxai/core-ui";
import { hierarchyImportTransactionApi } from "./redux/hierarchyImportTransactionApi";

import { AppRoutes } from "./routes/AppRoutes";
import "./extensions/solid-extensions";
import "./index.css";

function App() {

  // custom reducers and middlewares can be added to the StoreProvider
  const venueReducers = useMemo(
    () => ({
      [hierarchyImportTransactionApi.reducerPath]: hierarchyImportTransactionApi.reducer,
    }),
    []
  );
  const venueMiddlewares = useMemo(
    () => [hierarchyImportTransactionApi.middleware],
    []
  );

  return (
    <BrowserRouter>
      <StoreProvider reducers={venueReducers} middlewares={venueMiddlewares}>
        <PrimeReactProvider>
          <LayoutProvider>
            <SolidThemeProvider />
            <AppEventListener />
            <AppRoutes />
          </LayoutProvider>
        </PrimeReactProvider>
      </StoreProvider>
    </BrowserRouter>
  );
}

export default App;
