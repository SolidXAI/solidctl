import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './fetchBaseQuery';

export const mediaStorageProviderApi = createApi({
    reducerPath: 'mediaStorageProviderApi',
    baseQuery: baseQueryWithAuth,
    endpoints: (builder) => ({
        getMediaStorageProviders: builder.query({
            query: (qs) => {
                return `/media-storage-provider-metadata?${qs}`
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
        getMediaStorageProivderById: builder.query({
            query: (id) => `/media-storage-provider-metadata/${id}`,
        }),
        createMediaStorageProivder: builder.mutation({
            query: (MediaStorageProivder) => ({
                url: '/media-storage-provider-metadata',
                method: 'POST',
                body: MediaStorageProivder
            }),
        }),
        updateMediaStorageProivder: builder.mutation({
            query: ({ id, data }) => ({
                url: `/media-storage-provider-metadata/${id}`,
                method: 'PUT',
                body: data,
            }),
        }),
        deleteMultipleMediaStorageProviders: builder.mutation({
            query: (data) => ({
                url: `/media-storage-provider-metadata/bulk/`,
                method: 'DELETE',
                body: data
            }),
        }),
        deleteMediaStorageProivder: builder.mutation({
            query: (id) => ({
                url: `/media-storage-provider-metadata/${id}`,
                method: 'DELETE',
            }),
        }),
    })
})

export const { useGetMediaStorageProvidersQuery, useLazyGetMediaStorageProivderByIdQuery, useLazyGetMediaStorageProvidersQuery, useGetMediaStorageProivderByIdQuery, useCreateMediaStorageProivderMutation, useUpdateMediaStorageProivderMutation, useDeleteMediaStorageProivderMutation, useDeleteMultipleMediaStorageProvidersMutation } = mediaStorageProviderApi  
