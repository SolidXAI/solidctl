import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { AuthGuard } from "./guards/AuthGuard";
import { AdminLayoutWrapper } from "../layouts/AdminLayoutWrapper";
import { AuthLayoutWrapper } from "../layouts/AuthLayoutWrapper";
import { ErrorPage } from "./pages/ErrorPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { AdminPage } from "./pages/admin/AdminPage";
import { ModuleHomePage } from "./pages/admin/core/ModuleHomePage";
import { ListPage } from "./pages/admin/core/ListPage";
import { KanbanPage } from "./pages/admin/core/KanbanPage";
import { FormPage } from "./pages/admin/core/FormPage";
import { SettingsPage } from "./pages/admin/core/SettingsPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { InitiateForgotPasswordPage } from "./pages/auth/InitiateForgotPasswordPage";
import { InitiateForgotPasswordThankYouPage } from "./pages/auth/InitiateForgotPasswordThankYouPage";
import { ConfirmForgotPasswordPage } from "./pages/auth/ConfirmForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { InitiateLoginPage } from "./pages/auth/InitiateLoginPage";
import { InitiateRegisterPage } from "./pages/auth/InitiateRegisterPage";
import { InitiateGoogleOauthPage } from "./pages/auth/InitiateGoogleOauthPage";
import { SsoPage } from "./pages/auth/SsoPage";
import type { SolidRoutesOptions, SolidRouteKey } from "./types";

export function getSolidRoutes(options: SolidRoutesOptions = {}): RouteObject[] {
  const {
    extraAuthRoutes = [],
    extraAdminRoutes = [],
    extraRoutes = [],
    elementOverrides = {},
  } = options;

  const pick = (key: SolidRouteKey, fallback: JSX.Element) =>
    (elementOverrides[key] as JSX.Element) || fallback;

  const authChildren: RouteObject[] = [
    // Password based login, Passwordless login initiate otp
    { path: "/auth/login", element: pick("login", <LoginPage />) },
    // Password based registration, Passwordless registration initiate otp
    { path: "/auth/register", element: pick("register", <RegisterPage />) },
    // Passwordless login confirm otp
    { path: "/auth/initiate-login", element: pick("initiateLogin", <InitiateLoginPage />) },
    // Passwordless registration confirm otp
    { path: "/auth/initiate-register", element: pick("initiateRegister", <InitiateRegisterPage />) },

    // Forgot password flow
    { path: "/auth/forgot-password", element: pick("forgotPassword", <ForgotPasswordPage />) },
    { path: "/auth/initiate-forgot-password", element: pick("initiateForgotPassword", <InitiateForgotPasswordPage />) },
    { path: "/auth/initiate-forgot-password-thank-you", element: pick("initiateForgotPasswordThankYou", <InitiateForgotPasswordThankYouPage />) },
    { path: "/auth/confirm-forgot-password", element: pick("confirmForgotPassword", <ConfirmForgotPasswordPage />) },
    
    // ??? not used ???
    { path: "/auth/reset-password", element: pick("resetPassword", <ResetPasswordPage />) },

    { path: "/auth/initiate-google-oauth", element: pick("initiateGoogleOauth", <InitiateGoogleOauthPage />) },
    { path: "/auth/sso", element: pick("sso", <SsoPage />) },
    ...extraAuthRoutes,
  ];

  const adminChildren: RouteObject[] = [
    { path: "/admin", element: pick("admin", <AdminPage />) },
    { path: "/admin/core/:moduleName/home", element: pick("moduleHome", <ModuleHomePage />) },
    { path: "/admin/core/:moduleName/:modelName/list", element: pick("list", <ListPage />) },
    { path: "/admin/core/:moduleName/:modelName/kanban", element: pick("kanban", <KanbanPage />) },
    { path: "/admin/core/:moduleName/:modelName/form/:id", element: pick("form", <FormPage />) },
    { path: "/admin/core/:moduleName/settings/:settings", element: pick("settings", <SettingsPage />) },
    ...extraAdminRoutes,
  ];

  return [
    { path: "/error", element: pick("error", <ErrorPage />) },
    { path: "/not-found", element: pick("notFound", <NotFoundPage />) },
    { element: pick("authLayout", <AuthLayoutWrapper />), children: authChildren },
    {
      element: pick("authGuard", <AuthGuard />),
      children: [
        {
          element: pick("adminLayout", <AdminLayoutWrapper />),
          children: adminChildren,
        },
      ],
    },
    ...extraRoutes,
    { path: "/", element: <Navigate to="/auth/login" replace /> },
    { path: "*", element: <Navigate to="/not-found" replace /> },
  ];
}
