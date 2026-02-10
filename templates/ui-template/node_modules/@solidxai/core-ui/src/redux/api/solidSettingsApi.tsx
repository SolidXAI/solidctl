import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './fetchBaseQuery';

export const solidSettingsApi = createApi({
    reducerPath: 'solidSettingsApi',
    baseQuery: baseQueryWithAuth,
    endpoints: (builder) => ({
        createSolidSettings: builder.mutation({
            query: (data) => ({
                url: '/setting',
                method: 'POST',
                body: data
            }),
        }),
        getSolidSettings: builder.query({
            query: () => {
                return `/setting`
            },
        }),
        getAuthSettings: builder.query({
            query: () => {
                console.log(`builder.query running for endpoint /setting/wrapped`);
                return `/setting/wrapped`;
            },
            async onQueryStarted(_arg, { queryFulfilled }) {
                console.log("[solidSettingsApi] getAuthSettings onQueryStarted");
                try {
                    await queryFulfilled;
                    console.log("[solidSettingsApi] getAuthSettings queryFulfilled");
                } catch (err) {
                    console.error("[solidSettingsApi] getAuthSettings queryFulfilled error", err);
                }
            },
        }),
        getSolidSettingsById: builder.query({
            query: (id) => `/setting/${id}`,
        }),
        updateSolidSettings: builder.mutation({
            query: ({ id, data }) => ({
                url: `/setting/${id}`,
                method: 'PUT',
                body: data,
            }),
        }),
        bulkUpdateSolidSettings: builder.mutation({
            query: ({ data }) => ({
                url: `/setting/bulk`,
                method: 'PUT',
                body: data,
            }),
        }),
        bulkUpdateSolidUserSettings: builder.mutation({
            query: ({ data }) => ({
                url: `/setting/bulk/user`,
                method: 'POST',
                body: data,
            }),
        }),
        getMcpUrl: builder.query({
            query: (qs) => `/setting/get-mcp-url?${qs}`,
        }),

    })
});

if (typeof window !== "undefined") {
    (window as any).__solidSettingsApi = solidSettingsApi;
}

export const {
    useCreateSolidSettingsMutation,
    useGetSolidSettingsByIdQuery,
    useGetSolidSettingsQuery,
    useGetAuthSettingsQuery,
    useLazyGetAuthSettingsQuery,
    useLazyGetSolidSettingsQuery,
    useLazyGetSolidSettingsByIdQuery,
    useUpdateSolidSettingsMutation,
    useBulkUpdateSolidSettingsMutation,
    useBulkUpdateSolidUserSettingsMutation,
    useGetMcpUrlQuery,
    useLazyGetMcpUrlQuery
} = solidSettingsApi;
