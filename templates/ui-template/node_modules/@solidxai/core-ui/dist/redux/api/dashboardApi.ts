import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "./fetchBaseQuery";

// Types
interface Dashboard {
  id: string;
  name: string;
  [key: string]: any;
}

export interface DashboardResponse {
  records: Dashboard[];
  meta: {
    totalCount: number;
    [key: string]: any;
  };
}

export interface SelectionDynamicOption {
  value: string;
  label: string;
}

// API Definition
export const dashboardApi = createApi({
  reducerPath: "dashboardApi",
  baseQuery: baseQueryWithAuth,
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardResponse, string>({
      query: (qs) => `/dashboard?${qs}`,
      transformResponse: (response: any) => {
        // console.log(`Dashboard Response:`, response);
        if (response.error) {
          throw new Error(response.error);
        }
        return {
          records: response.data.records,
          meta: response.data.meta,
        };
      },
    }),
    getDashboardVariableSelectionDynamicValues: builder.query<SelectionDynamicOption[], string>({
      query: (qs) => `/dashboard/selection-dynamic-values?${qs}`,
      transformResponse: (response: any) => {
        // console.log(`Dashboard Variable Selection Dynamic Values Response:`, response);
        if (response.error) {
          throw new Error(response.error);
        }
        return response.data;
      },
    }),
  }),
});

// Hooks
export const { useGetDashboardQuery, useLazyGetDashboardQuery, useGetDashboardVariableSelectionDynamicValuesQuery, useLazyGetDashboardVariableSelectionDynamicValuesQuery } = dashboardApi;