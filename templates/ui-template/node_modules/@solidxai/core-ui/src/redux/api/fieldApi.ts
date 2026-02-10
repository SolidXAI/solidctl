import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './fetchBaseQuery';

export const fieldsApi = createApi({
    reducerPath: 'fieldApi',
    baseQuery: baseQueryWithAuth,
    endpoints: (builder) => ({
        getfields: builder.query({
            query: (qs) => {
                return `/field-metadata?populate[0]=model&${qs}`
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

        getfieldById: builder.query({
            query: (id) => `/field-metadata/${id}`,
        }),
        getFieldDefaultMetaData: builder.query({
            query: () => `/field-metadata/default`,
        }),
        getSelectionDynamicValues: builder.query({
            query: (qs) => `/field-metadata/selection-dynamic-values?${qs}`,
        }),
        getSelectionDynamicValue: builder.query({
            query: (qs) => `/field-metadata/selection-dynamic-value?${qs}`,
        }),
        createfield: builder.mutation({
            query: (field) => ({
                url: '/field-metadata',
                method: 'POST',
                body: field
            }),
        }),
        // updatefield: builder.mutation({
        //     query: ({ id, data }) => ({
        //         url: `/field-metadata/${id}`,
        //         method: 'PUT',
        //         body: data,
        //     }), 
        // }),
        // deleteMultiplefields: builder.mutation({
        //     query: (data) => ({
        //         url: `/field/bulk/`,
        //         method: 'DELETE',
        //         body:data
        //     }),
        // }),
        deletefield: builder.mutation({
            query: (id) => ({
                url: `/field/${id}`,
                method: 'DELETE',
            }),
        }),
        resolveS3Url: builder.mutation({
            query: (data) => ({
                url: '/field-metadata/resolve-s3-url',
                method: 'POST',
                body: data
            }),
        }),
    })
})

export const {
    useGetfieldsQuery,
    useLazyGetfieldsQuery,
    useLazyGetfieldByIdQuery,
    useGetFieldDefaultMetaDataQuery,
    useGetSelectionDynamicValuesQuery,
    useLazyGetSelectionDynamicValuesQuery,
    useGetSelectionDynamicValueQuery,
    useLazyGetSelectionDynamicValueQuery,
    useLazyGetFieldDefaultMetaDataQuery,
    useGetfieldByIdQuery,
    useCreatefieldMutation,
    useDeletefieldMutation,
    useResolveS3UrlMutation
} = fieldsApi  