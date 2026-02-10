import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from './fetchBaseQuery';

export const testApi = createApi({
    reducerPath: 'testApi',
    baseQuery: baseQueryWithAuth,
    endpoints: (builder) => ({
        seeder: builder.mutation({
            query: (name) => ({
                url: '/test/seed',
                method: 'POST',
                body: {
                    "seeder": name
                }
            }),
        }),
    })

});

export const {useSeederMutation} = testApi