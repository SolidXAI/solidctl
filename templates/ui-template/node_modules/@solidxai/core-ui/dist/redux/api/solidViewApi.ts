import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './fetchBaseQuery';

const resourceName = 'view-metadata';

export const solidViewsApi = createApi({
    reducerPath: 'viewMetadataApi',
    baseQuery: baseQueryWithAuth,
    endpoints: (builder) => ({
        getSolidViews: builder.query({
            query: (qs) => {
                return `/${resourceName}?populate[0]=model&populate[1]=module&${qs}`
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
        getSolidViewLayout: builder.query({
            query: (qs) => {
                return `/${resourceName}/custom/layout?${qs}`;
            }
        }),
        getSolidViewById: builder.query({
            query: (id) => `/${resourceName}/${id}?populate[0]=model&populate[1]=module`,
        }),
        createSolidView: builder.mutation({
            query: (solidView) => ({
                url: '/${resourceName}',
                method: 'POST',
                body: solidView
            }),
        }),
        updateSolidView: builder.mutation({
            query: ({ id, data }) => ({
                url: `/${resourceName}/${id}`,
                method: 'PUT',
                body: data,
            }),
        }),
        deleteMultipleSolidViews: builder.mutation({
            query: (data) => ({
                url: `/${resourceName}/bulk/`,
                method: 'DELETE',
                body: data
            }),
        }),
        deleteSolidView: builder.mutation({
            query: (id) => ({
                url: `/${resourceName}/${id}`,
                method: 'DELETE',
            }),
        }),
    }),
});

export const {
    useGetSolidViewsQuery,
    useLazyGetSolidViewsQuery,
    useLazyGetSolidViewByIdQuery,
    useGetSolidViewByIdQuery,
    useGetSolidViewLayoutQuery,
    useLazyGetSolidViewLayoutQuery,
    useCreateSolidViewMutation,
    useUpdateSolidViewMutation,
    useDeleteSolidViewMutation,
    useDeleteMultipleSolidViewsMutation
} = solidViewsApi;