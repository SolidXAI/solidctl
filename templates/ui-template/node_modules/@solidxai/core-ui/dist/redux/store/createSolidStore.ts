import { configureStore } from "@reduxjs/toolkit";
import type { Middleware, ReducersMapObject } from "@reduxjs/toolkit";
import { solidApiSlices, solidReducers } from "./defaultStoreConfig";
import { createSolidEntityApi } from "../api/solidEntityApi";

export type CreateSolidStoreOptions = {
  entities?: string[];
  reducers?: ReducersMapObject;
  middlewares?: Middleware[];
};

/**
 * createSolidStore builds the default SolidX store and lets consumers extend it.
 *
 * To add custom slices/middlewares in a consuming app:
 *   import { createSolidStore } from "@solidxai/core-ui";
 *   import myReducer from "./myReducer";
 *   import myMiddleware from "./myMiddleware";
 *
 *   const store = createSolidStore({
 *     entities,
 *     reducers: { mySlice: myReducer },
 *     middlewares: [myMiddleware],
 *   });
 */
export function createSolidStore(options: CreateSolidStoreOptions = {}) {
  const { entities = [], reducers = {}, middlewares = [] } = options;

  const rootReducers: ReducersMapObject = {
    ...solidReducers,
    ...Object.fromEntries(solidApiSlices.map((api) => [api.reducerPath, api.reducer])),
    ...reducers,
  } as ReducersMapObject;

  const rootMiddlewares: Middleware[] = [
    ...solidApiSlices.map((api) => api.middleware as Middleware),
    ...middlewares,
  ];

  for (let i = 0; i < entities.length; i += 1) {
    const entity = entities[i];
    const apiSlice = createSolidEntityApi(entity);
    rootReducers[apiSlice.reducerPath] = apiSlice.reducer;
    rootMiddlewares.push(apiSlice.middleware as Middleware);
  }

  return configureStore({
    reducer: rootReducers,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(rootMiddlewares),
  });
}

export type SolidStore = ReturnType<typeof createSolidStore>;
export type SolidRootState = ReturnType<SolidStore["getState"]>;
export type SolidDispatch = SolidStore["dispatch"];
