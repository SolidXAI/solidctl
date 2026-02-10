import { AuthLayout } from "../components/auth/AuthLayout";
import { Outlet } from "react-router-dom";

export function AuthLayoutWrapper() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}
