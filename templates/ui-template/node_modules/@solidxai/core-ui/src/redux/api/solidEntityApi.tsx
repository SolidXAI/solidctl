import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './fetchBaseQuery';
import { kebabCase } from 'change-case';

export const createSolidEntityApi = (entityName: string) => {
    const kebabEntityName = kebabCase(entityName);

    return createApi({
        reducerPath: `genericSolid${entityName}Api`,
        baseQuery: baseQueryWithAuth,
        tagTypes: [entityName],
        endpoints: (builder) => ({
            getSolidEntities: builder.query({
                query: (qs) => {
                    return `/${kebabEntityName}?&${qs}`
                },
                transformResponse: (response: any) => {
                    if (response.error) {
                        throw new Error(response.error);
                    }
                    return {
                        records: response.data.records,
                        meta: response.data.meta,
                        groupMeta: response?.data?.groupMeta,
                        groupRecords: response?.data?.groupRecords ? response.data.groupRecords : [],
                    }
                },
                providesTags: (result) =>
                    result?.records
                        ? [
                            ...result.records.map((record: { id: any; }) => ({
                                type: entityName,
                                id: record.id,
                            })),
                            { type: entityName, id: 'LIST' },
                        ]
                        : [{ type: entityName, id: 'LIST' }]
            }),
            getSolidKanbanEntities: builder.query({
                query: (qs) => {
                    return `/${kebabEntityName}/group-kanban?&${qs}`
                },
                transformResponse: (response: any) => {
                    if (response.error) {
                        throw new Error(response.error);
                    }
                    return {
                        records: response.data.records.groupedData,
                        meta: response.data.meta
                    }
                },
                providesTags: [{ type: entityName, id: 'KANBAN' }],
            }),
            getSolidEntityById: builder.query({
                query: ({ id, qs }) => {
                    return `/${kebabEntityName}/${id}?${qs}`
                },
                // providesTags: () => [{ type: entityName }],
                providesTags: (_result, _error, { id }) => [{ type: entityName, id }],
            }),
            createSolidEntity: builder.mutation({
                query: (entity) => ({
                    url: `/${kebabEntityName}`,
                    method: 'POST',
                    body: entity
                }),
                invalidatesTags: [{ type: entityName, id: 'LIST' }],
            }),
            upsertSolidEntity: builder.mutation({
                query: (entity) => ({
                    url: `/${kebabEntityName}/upsert`,
                    method: 'POST',
                    body: entity
                }),
                invalidatesTags: [{ type: entityName, id: 'LIST' }],
            }),
            updateSolidEntity: builder.mutation({
                query: ({ id, data }) => ({
                    url: `/${kebabEntityName}/${id}`,
                    method: 'PUT',
                    body: data,
                }),
                invalidatesTags: (_result, _error, { id }) => [
                    { type: entityName, id },
                    { type: entityName, id: 'LIST' },
                ],
            }),
            deleteMultipleSolidEntities: builder.mutation({
                query: (data) => ({
                    url: `/${kebabEntityName}/bulk/`,
                    method: 'DELETE',
                    body: data
                }),
                invalidatesTags: [{ type: entityName, id: 'LIST' }]
            }),
            deleteSolidEntity: builder.mutation({
                query: (id) => ({
                    url: `/${kebabEntityName}/${id}`,
                    method: 'DELETE',
                }),
                invalidatesTags: (_result, _error, id) => [
                    { type: entityName, id },
                    { type: entityName, id: 'LIST' },
                ],
            }),
            recoverSolidEntityById: builder.query({
                query: (id) => `/${kebabEntityName}/recover/${id}`,
                providesTags: (_result, _error, id) => [{ type: entityName, id }],
            }),
            recoverSolidEntity: builder.mutation({
                query: (data) => ({
                    url: `/${kebabEntityName}/bulk-recover/`,
                    method: 'POST',
                    body: data
                }),
                invalidatesTags: [{ type: entityName, id: 'LIST' }],
            }),
            patchUpdateSolidEntity: builder.mutation({
                query: ({ id, data }) => ({
                    url: `/${kebabEntityName}/${id}`,
                    method: 'PATCH',
                    body: data,
                }),
                invalidatesTags: (_result, _error, { id }) => [
                    { type: entityName, id },
                    { type: entityName, id: 'LIST' },
                ],
            }),
            publishSolidEntity: builder.mutation({
                query: (id) => ({
                    url: `/${kebabEntityName}/${id}/publish`,
                    method: 'POST'
                }),
                invalidatesTags: (_result, _error, id) => [
                    { type: entityName, id },
                    { type: entityName, id: 'LIST' }
                ]
            }),
            unpublishSolidEntity: builder.mutation({
                query: (id) => ({
                    url: `/${kebabEntityName}/${id}/unpublish`,
                    method: 'POST'
                }),
                invalidatesTags: (_result, _error, id) => [
                    { type: entityName, id },
                    { type: entityName, id: 'LIST' }
                ]
            }),

        }),
    });
};

// export const {
//     useCreateSolidEntityMutation,
//     useDeleteMultipleSolidEntitiesMutation,
//     useDeleteSolidEntityMutation,
//     useGetSolidEntitiesQuery,
//     useGetSolidEntityByIdQuery,
//     useLazyGetSolidEntitiesQuery,
//     useLazyGetSolidEntityByIdQuery,
//     usePrefetch,
//     useUpdateSolidEntityMutation
// } = solidEntityApi;
