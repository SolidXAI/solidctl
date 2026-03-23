import { getSolidRoutes } from "@solidxai/core-ui";
import { useRoutes } from "react-router-dom";

export function AppRoutes() {
  const routes = getSolidRoutes();

  return useRoutes(routes);
}
