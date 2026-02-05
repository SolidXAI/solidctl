// 'use client';
// @ts-nocheck
import { configureStore } from "@reduxjs/toolkit";
import {
  solidApiSlices,
  solidReducers,
  createSolidEntityApi
} from "@solidx/solid-core-ui";

export function initializeStore(entities: string[] = []) {

  const reducers = {
    ...solidReducers,
    ...Object.fromEntries(
      solidApiSlices.map(api => [api.reducerPath, api.reducer])
    ),
    //add anditional custom api slice
    //eg. [customImportTransactionApi.reducerPath]: customImportTransactionApi.reducer,

    // Add any additional reducers here
    // eg.theme: themeReducer,
  };


  const middlewares = [
    ...solidApiSlices.map(api => api.middleware),
    //add any additional custom middlewares here
    //eg. customImportTransactionApi.middleware,
  ];


  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];

    // Dynamic API slice creation... 
    const apiSlice = createSolidEntityApi(entity);

    // Use the dynamically created slice to register a reducer and middleware.
    //@ts-ignore
    reducers[apiSlice.reducerPath] = apiSlice.reducer;
    middlewares.push(apiSlice.middleware);
  }

  return configureStore({
    reducer: reducers,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(middlewares),
  });
}

// export type RootState = ReturnType<ReturnType<typeof initializeStore>['getState']>;
// export type AppDispatch = ReturnType<typeof initializeStore>['dispatch']