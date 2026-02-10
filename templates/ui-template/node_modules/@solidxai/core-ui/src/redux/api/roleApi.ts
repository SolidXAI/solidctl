import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "./fetchBaseQuery";


const resourceName = 'role-metadata';



export const roleApi = createApi({
  reducerPath: "roleApi",
  baseQuery: baseQueryWithAuth,
  endpoints: (builder) => ({
    getroles: builder.query({
      query: (qs) => {
        return `/${resourceName}?offset=0&limit=1000&${qs}`
      },
    }),
    getroleById: builder.query({
      query: (id) => `/${resourceName}/${id}?offset=0&limit=5`,
    }),
    createrole: builder.mutation({
      query: (role) => ({
        url: '/${resourceName}',
        method: 'POST',
        body: role
      }),
    }),
    updaterole: builder.mutation({
      query: ({ id, data }) => ({
        url: `/${resourceName}/${id}`,
        method: 'PATCH',
        body: data,
      }),
    }),
    deleteMultipleRoles: builder.mutation({
      query: (data) => ({
        url: `/${resourceName}/bulk/`,
        method: 'DELETE',
        body: data
      }),
    }),
    deleterole: builder.mutation({
      query: (id) => ({
        url: `/${resourceName}/${id}`,
        method: 'DELETE',
      }),
    }),
  }),
});

export const {
  useGetrolesQuery,
  useGetroleByIdQuery,
  useCreateroleMutation,
  useLazyGetrolesQuery,
  useUpdateroleMutation,
  useDeleteroleMutation
} = roleApi;
