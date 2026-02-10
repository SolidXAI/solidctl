import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { createSolidStore, type SolidStore } from "./createSolidStore";
import { eventBus, AppEvents } from "../../helpers/eventBus";
import { solidGet } from "../../http/solidHttp";

async function fetchEntities(): Promise<string[]> {
  const response = await solidGet("/model-metadata/public");
  const data = response?.data;
  const records = data?.data?.records || [];
  return records.map((r: { singularName: string }) => r.singularName);
}

export function StoreProvider({
  children,
  reducers,
  middlewares,
}: {
  children: ReactNode;
  reducers?: NonNullable<Parameters<typeof createSolidStore>[0]>["reducers"];
  middlewares?: NonNullable<Parameters<typeof createSolidStore>[0]>["middlewares"];
}) {
  const [store, setStore] = useState<SolidStore | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchEntities()
      .then((entities) => {
        if (!mounted) return;
        setStore(createSolidStore({ entities, reducers, middlewares }));
      })
      .catch(() => {
        if (!mounted) return;
        eventBus.emit(AppEvents.GlobalError, {
          message: "Unable to reach the server. Please try again later.",
        });
        setStore(createSolidStore({ entities: [], reducers, middlewares }));
      });

    return () => {
      mounted = false;
    };
  }, [reducers, middlewares]);

  const content = useMemo(() => {
    if (!store) return <div>Loading...</div>;
    return <Provider store={store}>{children}</Provider>;
  }, [store, children]);

  return content;
}
