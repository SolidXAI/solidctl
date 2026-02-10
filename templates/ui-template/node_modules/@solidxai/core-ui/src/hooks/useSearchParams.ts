import { useLocation } from "react-router-dom";
import { useMemo } from "react";

export function useSearchParams(): URLSearchParams {
  const location = useLocation();

  return useMemo(() => {
    return new URLSearchParams(location.search);
  }, [location.search]);
}
