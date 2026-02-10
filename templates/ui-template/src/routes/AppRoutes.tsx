import { useRoutes } from "react-router-dom";
import { getSolidRoutes } from "@solidxai/core-ui";
import { VenueAppLoginPage } from "../pages/auth/VenueAppLoginPage";
import { HelloAuthPage } from "../pages/auth/HelloAuthPage";
import { AboutPage } from "../pages/static/AboutPage";
import { AdminInfoPage } from "../pages/admin/AdminInfoPage";

export function AppRoutes() {
  // Example of overriding and extending the default Solid routes...
  const elementOverrides = {
    login: <VenueAppLoginPage />,
  };

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
    elementOverrides,
    extraAuthRoutes,
    extraRoutes,
    extraAdminRoutes,
  });

  return useRoutes(routes);
}
