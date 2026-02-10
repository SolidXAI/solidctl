import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './fetchBaseQuery';

export const mediaApi = createApi({
    reducerPath: 'mediaApi',
    baseQuery: baseQueryWithAuth,
    endpoints: (builder) => ({
        getMedias: builder.query({
            query: (qs) => {
                return `/media?${qs}`
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
        getMediaById: builder.query({
            query: (id) => `/media/${id}`,
        }),
        createMedia: builder.mutation({
            query: (Media) => ({
                url: '/media',
                method: 'POST',
                body: Media
            }),
        }),
        updateMedia: builder.mutation({
            query: ({ id, data }) => ({
                url: `/media/${id}`,
                method: 'PUT',
                body: data,
            }),
        }),
        deleteMultipleMedias: builder.mutation({
            query: (data) => ({
                url: `/media/bulk/`,
                method: 'DELETE',
                body: data
            }),
        }),
        deleteMedia: builder.mutation({
            query: (id) => ({
                url: `/media/${id}`,
                method: 'DELETE',
            }),
        }),
    })
})

export const { useGetMediasQuery, useLazyGetMediaByIdQuery, useLazyGetMediasQuery, useGetMediaByIdQuery, useCreateMediaMutation, useUpdateMediaMutation, useDeleteMediaMutation, useDeleteMultipleMediasMutation } = mediaApi  
