import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './fetchBaseQuery';

export const pincodesApi = createApi({
    reducerPath: 'pincodesApi',
    baseQuery: baseQueryWithAuth,
    endpoints: (builder) => ({
        getPincodes: builder.query({
            query: (qs) => {
                return `/pincode?populate[]=city&${qs}`
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
        getPincodeById: builder.query({
            query: (id) => `/pincode/${id}?populate[]=city`,
        }),
        createPincode: builder.mutation({
            query: (pincode) => ({
                url: '/pincode',
                method: 'POST',
                body: pincode
            }),
        }),
        // updatePincode: builder.mutation({
        //     query: ({ id, data }) => ({
        //         url: `/pincode/${id}`,
        //         method: 'Patch',
        //         body: data,
        //     }),
        // }),

        deleteMultiplePincodes: builder.mutation({
            query: (data) => ({
                url: `/pincode/bulk/`,
                method: 'DELETE',
                body: data
            }),
        }),
        deletePincode: builder.mutation({
            query: (id) => ({
                url: `/pincode/${id}`,
                method: 'DELETE',
            }),
        }),
    })
})

export const { useLazyGetPincodesQuery, useCreatePincodeMutation, useDeletePincodeMutation, useDeleteMultiplePincodesMutation, useGetPincodesQuery, useGetPincodeByIdQuery, useLazyGetPincodeByIdQuery, usePrefetch } = pincodesApi  