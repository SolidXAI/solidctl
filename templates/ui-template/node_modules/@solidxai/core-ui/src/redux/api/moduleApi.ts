import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './fetchBaseQuery';

export const modulesApi = createApi({
    reducerPath: 'moduleApi',
    baseQuery: baseQueryWithAuth,
    endpoints: (builder) => ({
        getmodules: builder.query({
            query: (qs) => {
                return `/module-metadata?${qs}`
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
        getmoduleById: builder.query({
            query: (id) => `/module-metadata/${id}`,
        }),
        createmodule: builder.mutation({
            query: (module) => ({
                url: '/module-metadata',
                method: 'POST',
                body: module
            }),
        }),
        generateCodeFormodule: builder.mutation({
            query: (module) => ({
                url: `/module-metadata/${module.id}/generate-code`,
                method: 'POST',
                body: module
            }),
        }),
        refreshPermissions: builder.mutation({
            query: (module) => ({
                url: `/module-metadata/refresh-permission`,
                method: 'POST',
                body: module
            }),
        }),
        updatemodule: builder.mutation({
            query: ({ id, data }) => ({
                url: `/module-metadata/${id}`,
                method: 'PUT',
                body: data,
            }),
        }),
        deleteMultiplemodules: builder.mutation({
            query: (data) => ({
                url: `/module-metadata/bulk/`,
                method: 'DELETE',
                body: data
            }),
        }),
        deletemodule: builder.mutation({
            query: (id) => ({
                url: `/module-metadata/${id}`,
                method: 'DELETE',
            }),
        }),
        getDefaultDataSource: builder.query({
            query: () => `/module-metadata/fetch-default-datasource`,
        }),
    })
})

export const { useGetmodulesQuery, useLazyGetmodulesQuery, useLazyGetmoduleByIdQuery, useGetmoduleByIdQuery, useCreatemoduleMutation, useGenerateCodeFormoduleMutation, useRefreshPermissionsMutation, useUpdatemoduleMutation, useDeletemoduleMutation, useDeleteMultiplemodulesMutation, useGetDefaultDataSourceQuery, useLazyGetDefaultDataSourceQuery } = modulesApi  