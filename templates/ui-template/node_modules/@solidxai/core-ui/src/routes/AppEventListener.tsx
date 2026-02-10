import { useEffect } from "react";
import { eventBus, AppEvents } from "../helpers/eventBus";
import { useRouter } from "../hooks/useRouter";
import { usePathname } from "../hooks/usePathname";

type GlobalErrorPayload = {
  status?: number | string;
  message?: string;
};

export function AppEventListener() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const off = eventBus.on<GlobalErrorPayload>(AppEvents.GlobalError, (payload) => {
      if (payload?.message) {
        sessionStorage.setItem("solidx.globalError", payload.message);
      }
      if (pathname !== "/error") {
        router.push("/error");
      }
    });
    return () => off();
  }, [router, pathname]);

  return null;
}
