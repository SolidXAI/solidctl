import "@solidxai/core-ui";
import "primeflex/primeflex.css";
import "primeicons/primeicons.css";

import { AppEventListener, LayoutProvider, SolidThemeProvider, StoreProvider } from "@solidxai/core-ui";
import { PrimeReactProvider } from "primereact/api";
import { BrowserRouter } from "react-router-dom";

import "./extensions/solid-extensions";
import "./index.css";
import { AppRoutes } from "./routes/AppRoutes";

function App() {

  return (
    <BrowserRouter>
      <StoreProvider>
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
