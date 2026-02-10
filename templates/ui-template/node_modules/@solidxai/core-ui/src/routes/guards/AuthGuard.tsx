import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../../hooks/useSession";

export function AuthGuard() {
  const location = useLocation();
  const { status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
