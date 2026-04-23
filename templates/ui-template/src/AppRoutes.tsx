import { useRoutes } from "react-router-dom";
import { getSolidRoutes } from "@solidxai/core-ui";

import { solidUiModuleRuntime } from "./solid-ui-modules";

export function AppRoutes() {
  const routes = getSolidRoutes(solidUiModuleRuntime.routes);

  return useRoutes(routes);
}
