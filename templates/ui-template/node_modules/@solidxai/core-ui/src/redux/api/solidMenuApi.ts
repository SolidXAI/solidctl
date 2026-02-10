import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './fetchBaseQuery';

const resourceName = 'menu-item-metadata';

export const solidMenusApi = createApi({
    reducerPath: 'solidMenuApi',
    baseQuery: baseQueryWithAuth,
    endpoints: (builder) => ({
        getSolidMenus: builder.query({
            query: (qs) => {
                return `/${resourceName}?populate[0]=module&populate[1]=action&populate[2]=parentMenuItem&populate[3]=roles&${qs}`
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
        getSolidMenuById: builder.query({
            query: (id) => `/${resourceName}/${id}?populate[0]=module&populate[1]=action&populate[2]=parentMenuItem&populate[3]=roles`,
        }),
        getSolidMenuBasedOnRole: builder.query({
            query: () => `/${resourceName}/me`,
        }),
        createSolidMenu: builder.mutation({
            query: (solidMenu) => ({
                url: '/${resourceName}',
                method: 'POST',
                body: solidMenu
            }),
        }),
        updateSolidMenu: builder.mutation({
            query: ({ id, data }) => ({
                url: `/${resourceName}/${id}`,
                method: 'PUT',
                body: data,
            }),
        }),
        deleteMultipleSolidMenus: builder.mutation({
            query: (data) => ({
                url: `/${resourceName}/bulk/`,
                method: 'DELETE',
                body: data
            }),
        }),
        deleteSolidMenu: builder.mutation({
            query: (id) => ({
                url: `/${resourceName}/${id}`,
                method: 'DELETE',
            }),
        }),
    })
});

export const {
    useGetSolidMenusQuery,
    useLazyGetSolidMenusQuery,
    useLazyGetSolidMenuByIdQuery,
    useGetSolidMenuBasedOnRoleQuery,
    useLazyGetSolidMenuBasedOnRoleQuery,
    useGetSolidMenuByIdQuery,
    useCreateSolidMenuMutation,
    useUpdateSolidMenuMutation,
    useDeleteSolidMenuMutation,
    useDeleteMultipleSolidMenusMutation
} = solidMenusApi;
