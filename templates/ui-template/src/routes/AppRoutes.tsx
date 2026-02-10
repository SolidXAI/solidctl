import { useRoutes } from "react-router-dom";
import { getSolidRoutes } from "@solidxai/core-ui";
import { HelloAuthPage } from "../pages/auth/HelloAuthPage";
import { AboutPage } from "../pages/static/AboutPage";
import { AdminInfoPage } from "../pages/admin/AdminInfoPage";

export function AppRoutes() {
  // Example of adding an extra route that uses the AuthLayout...
  const extraAuthRoutes = [
    { path: "/auth/hello", element: <HelloAuthPage /> },
  ];
  // Example of adding an extra route that uses the AdminLayout...
  const extraAdminRoutes = [
    { path: "/admin/info", element: <AdminInfoPage /> },
  ];
  // Example of adding an extra route that uses the MainLayout...
  const extraRoutes = [
    { path: "/about", element: <AboutPage /> },
  ]
  const routes = getSolidRoutes({
    extraAuthRoutes,
    extraRoutes,
    extraAdminRoutes,
  });

  return useRoutes(routes);
}
