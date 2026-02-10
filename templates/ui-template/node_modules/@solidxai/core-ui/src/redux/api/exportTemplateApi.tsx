import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './fetchBaseQuery';

export const exportTemplateApi = createApi({
    reducerPath: 'exportTemplateApi',
    baseQuery: baseQueryWithAuth,
    tagTypes: ['ExportTemplates'],
    endpoints: (builder) => ({
        createExportTemplate: builder.mutation({
            query: (templateData) => ({
                url: '/export-template',
                method: 'POST',
                body: templateData
            }),
            invalidatesTags: ['ExportTemplates'],
        }),
        getExportTemplates: builder.query({
            query: () => {
                return `/export-template`
            },
            transformResponse: (response: any) => {
                if (response.error) {
                    throw new Error(response.error);
                }
                return {
                    records: response.data.records,
                    meta: response.data.meta
                }
            },
            providesTags: ['ExportTemplates'],
        }),
        createExportSync: builder.mutation({
            query: ({id}) => ({
                url: `/export-template/${id}/startExport/sync`,
            }),
            transformResponse: (response: any) => {
                return {
                    file: response
                }
            }
        }),
        createExportAsync: builder.mutation({
            query: ({id,templateData}) => ({
                url: `/export-template/${id}/startExport/async`,
                method: 'POST',
                body: templateData
            }),
        }),
         deleteExportTemplate: builder.mutation({
            query: (id) => ({
                url: `/export-template/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['ExportTemplates'],
        }),
    })
})

export const { useCreateExportTemplateMutation,useGetExportTemplatesQuery,useCreateExportSyncMutation,useCreateExportAsyncMutation,useDeleteExportTemplateMutation } = exportTemplateApi