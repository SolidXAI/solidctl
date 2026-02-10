import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "./fetchBaseQuery";

// API Definition
export const dashboardQuestionApi = createApi({
  reducerPath: "dashboardQuestionApi",
  baseQuery: baseQueryWithAuth,
  endpoints: (builder) => ({
    getDashboardQuestionDataById: builder.query({
      query: ({ id, qs }) => `/dashboard-question/${id}/data?${qs}`,
    }),

  }),
});

// Hooks
export const { useGetDashboardQuestionDataByIdQuery, useLazyGetDashboardQuestionDataByIdQuery } = dashboardQuestionApi;