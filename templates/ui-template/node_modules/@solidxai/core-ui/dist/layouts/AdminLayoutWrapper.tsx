import { AdminLayout } from "../components/layout/AdminLayout";
import { Outlet } from "react-router-dom";

export function AdminLayoutWrapper() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
