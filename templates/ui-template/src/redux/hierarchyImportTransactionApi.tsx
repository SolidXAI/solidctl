import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "@solidxai/core-ui";

export const hierarchyImportTransactionApi = createApi({
  reducerPath: "hierarchyImportTransactionApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["HierarchyImportTransaction"],
  endpoints: (builder) => ({
    validateHierarchyImport: builder.mutation({
      query: ({ id }) => ({
        url: `/hierarchy-import-transaction/${id}/validate-import`,
        method: "POST",
      }),
    }),
    triggerHierarchyImport: builder.mutation({
      query: ({ id }) => ({
        url: `/hierarchy-import-transaction/${id}/trigger-import`,
        method: "POST",
      }),
      invalidatesTags: ["HierarchyImportTransaction"],
    }),
  }),
});

export const {
  useValidateHierarchyImportMutation,
  useTriggerHierarchyImportMutation,
} = hierarchyImportTransactionApi;
