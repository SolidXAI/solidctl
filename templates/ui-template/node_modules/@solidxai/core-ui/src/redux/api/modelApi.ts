import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './fetchBaseQuery';

export const modelsApi = createApi({
    reducerPath: 'modelApi',
    baseQuery: baseQueryWithAuth,
    endpoints: (builder) => ({
        getModels: builder.query({
            query: (qs) => {
                return `/model-metadata?&populate[1]=userKeyField&${qs}`
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
        getmodelById: builder.query({
            query: (id) => `/model-metadata/${id}?populate[0]=fields&populate[1]=module&&populate[2]=fields.mediaStorageProvider&populate[3]=parentModel`,
        }),
        createmodel: builder.mutation({
            query: (model) => ({
                url: '/model-metadata',
                method: 'POST',
                body: model
            }),
        }),
        generateCodeForModel: builder.mutation({
            query: (model) => ({
                url: `/model-metadata/${model.id}/generate-code`,
                method: 'POST',
                body: model
            }),
        }),
       
        updatemodel: builder.mutation({
            query: ({ id, data }) => ({
                url: `/model-metadata/${id}`,
                method: 'Put',
                body: data,
            }), 
        }),
        // deleteMultiplemodels: builder.mutation({
        //     query: (data) => ({
        //         url: `/model/bulk/`,
        //         method: 'DELETE',
        //         body:data
        //     }),
        // }),
        deleteMultipleModels: builder.mutation({
            query: (data) => ({
                url: `/model-metadata/bulk/`,
                method: 'DELETE',
                body:data
            }),
        }),
        deletemodel: builder.mutation({
            query: (id) => ({
                url: `/model-metadata/${id}`,
                method: 'DELETE',
            }),
        }),
        updateUserKey: builder.mutation({
            query: (data) => ({
                url: `/model-metadata/update-user-key`,
                method: 'POST',
                body: data,
            }), 
        }),
        navigation: builder.query({
            query: (qs) => `/model-metadata/navigation?${qs}`,
        }),
    })
})

export const { useGetModelsQuery,useLazyGetModelsQuery, useLazyGetmodelByIdQuery, useGetmodelByIdQuery, useCreatemodelMutation,useGenerateCodeForModelMutation,useUpdatemodelMutation, useDeleteMultipleModelsMutation ,useDeletemodelMutation, useUpdateUserKeyMutation,useLazyNavigationQuery } = modelsApi  