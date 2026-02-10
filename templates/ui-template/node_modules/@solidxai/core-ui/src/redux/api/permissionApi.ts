import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "./fetchBaseQuery";

export const permissionApi = createApi({
  reducerPath: "permissionApi",
  baseQuery: baseQueryWithAuth,
  endpoints: (builder) => ({
    getpermissions: builder.query({
      query: (qs) => {
        return `/permissions?${qs}`
      },
      transformResponse: (response: any) => {
        if (response.error) {
            throw new Error(response.error);
        }
        return {
            records: response.data.records,
            meta: response.data.meta
        }
      }
    }),
    getpermissionsById: builder.query({
        query: (id) => `/permissions/${id}?offset=0&limit=5`,
    }),
  }),
});

export const {
  useGetpermissionsByIdQuery,
  useGetpermissionsQuery,
  useLazyGetpermissionsQuery
} = permissionApi;
