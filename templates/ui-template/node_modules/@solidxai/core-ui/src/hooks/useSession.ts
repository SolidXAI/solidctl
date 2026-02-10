import { useEffect, useState } from "react";
import { loadSession } from "../adapters/auth/storage";
import { getSession } from "../adapters/auth/getSession";
import type { Session } from "../adapters/auth/types";
import { eventBus, AppEvents } from "../helpers/eventBus";

type UseSessionResult = {
  data: Session;
  status: "loading" | "authenticated" | "unauthenticated";
  update: () => Promise<Session>;
};

export function useSession(): UseSessionResult {
  const [data, setData] = useState<Session>(() => loadSession());
  const [status, setStatus] = useState<UseSessionResult["status"]>(
    data?.user?.accessToken ? "authenticated" : "unauthenticated"
  );

  const update = async () => {
    setStatus("loading");
    const session = await getSession();
    setData(session);
    setStatus(session?.user?.accessToken ? "authenticated" : "unauthenticated");
    return session;
  };

  useEffect(() => {
    update();
    const offUpdate = eventBus.on<Session>(AppEvents.SessionUpdated, (session) => {
      setData(session || null);
      setStatus(session?.user?.accessToken ? "authenticated" : "unauthenticated");
    });
    const offClear = eventBus.on(AppEvents.SessionCleared, () => {
      setData(null);
      setStatus("unauthenticated");
    });
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key !== "solidx.session") return;
      const session = loadSession();
      setData(session);
      setStatus(session?.user?.accessToken ? "authenticated" : "unauthenticated");
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      offUpdate();
      offClear();
    };
  }, []);

  return { data, status, update };
}
