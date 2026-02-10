import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './fetchBaseQuery';

export const statesApi = createApi({
    reducerPath: 'statesApi',
    baseQuery: baseQueryWithAuth,
    endpoints: (builder) => ({
        getStates: builder.query({
            query: (qs) => {
                return `/state?populate[]=country&${qs}`
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
        getStateById: builder.query({
            query: (id) => `/state/${id}?populate[]=country`,
        }),
        createState: builder.mutation({
            query: (state) => ({
                url: '/state',
                method: 'POST',
                body: state
            }),
        }),
        // updateState: builder.mutation({
        //     query: ({ id, data }) => ({
        //         url: `/state/${id}`,
        //         method: 'Patch',
        //         body: data,
        //     }),
        // }),

        deleteMultipleStates: builder.mutation({
            query: (data) => ({
                url: `/state/bulk/`,
                method: 'DELETE',
                body: data
            }),
        }),
        deleteState: builder.mutation({
            query: (id) => ({
                url: `/state/${id}`,
                method: 'DELETE',
            }),
        }),
    })
})

export const { useLazyGetStatesQuery, useCreateStateMutation, useDeleteStateMutation, useDeleteMultipleStatesMutation, useGetStatesQuery, useGetStateByIdQuery, useLazyGetStateByIdQuery, usePrefetch } = statesApi  