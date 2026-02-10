import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './fetchBaseQuery';

const resourceName = 'action-metadata';

export const solidActionsApi = createApi({
    reducerPath: 'actionMetadataApi',
    baseQuery: baseQueryWithAuth,
    endpoints: (builder) => ({
        getSolidActions: builder.query({
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
        getSolidActionById: builder.query({
            query: (id) => `/${resourceName}/${id}?populate[0]=model&populate[1]=module&populate[2]=view`,
        }),
        createSolidAction: builder.mutation({
            query: (solidAction) => ({
                url: '/${resourceName}',
                method: 'POST',
                body: solidAction
            }),
        }),
        updateSolidAction: builder.mutation({
            query: ({ id, data }) => ({
                url: `/${resourceName}/${id}`,
                method: 'PUT',
                body: data,
            }),
        }),
        deleteMultipleSolidActions: builder.mutation({
            query: (data) => ({
                url: `/${resourceName}/bulk/`,
                method: 'DELETE',
                body: data
            }),
        }),
        deleteSolidAction: builder.mutation({
            query: (id) => ({
                url: `/${resourceName}/${id}`,
                method: 'DELETE',
            }),
        }),
    }),
});

export const {
    useGetSolidActionsQuery,
    useLazyGetSolidActionsQuery,
    useLazyGetSolidActionByIdQuery,
    useGetSolidActionByIdQuery,
    useCreateSolidActionMutation,
    useUpdateSolidActionMutation,
    useDeleteSolidActionMutation,
    useDeleteMultipleSolidActionsMutation
} = solidActionsApi  