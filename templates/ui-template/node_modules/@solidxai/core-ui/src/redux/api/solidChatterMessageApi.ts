import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './fetchBaseQuery';

export const solidChatterMessageApi = createApi({
    reducerPath: 'solidChatterMessageApi',
    baseQuery: baseQueryWithAuth,
    endpoints: (builder) => ({
        getchatterMessage: builder.query({
            query: ({ entityId, entityName, qs }) => {
                return `/chatter-message/getChatterMessages/${entityId}/${entityName}?populateMedia[0]=messageAttachments&${qs}`
            },
        }),
        createChatterMessage: builder.mutation({
            query: (data) => {
                return {
                    url: '/chatter-message',
                    method: 'POST',
                    body: data
                }
            }
        })
    })
});

export const { useGetchatterMessageQuery, useLazyGetchatterMessageQuery, useCreateChatterMessageMutation } = solidChatterMessageApi;