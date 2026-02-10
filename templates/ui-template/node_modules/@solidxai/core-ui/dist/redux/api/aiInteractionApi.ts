import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "./fetchBaseQuery";

interface TriggerMcpClientJobRequest {
    prompt: string;
    moduleName?:string;
}

interface TriggerMcpClientJobResponse {
    statusCode: number;
    message: string[];
    error: string;
    data: any;
}

interface ApplySolidAiInteractionRequest {
    id: number;
}

interface ApplySolidAiInteractionResponse {
    statusCode: number;
    message: string[];
    error: string;
    data: any; 
}


export type {
    ApplySolidAiInteractionRequest,
    ApplySolidAiInteractionResponse,
    TriggerMcpClientJobRequest,
    TriggerMcpClientJobResponse
  };

export const aiInteractionApi = createApi({
    reducerPath: "aiInteractionApi",
    baseQuery: baseQueryWithAuth,
    endpoints: (builder) => ({
        triggerMcpClientJob: builder.mutation<TriggerMcpClientJobResponse, TriggerMcpClientJobRequest>({
            query: (body) => ({
                url: "/ai-interaction/trigger-mcp-client-job",
                method: "POST",
                body,
            }),
        }),
        applySolidAiInteraction: builder.mutation<ApplySolidAiInteractionResponse, ApplySolidAiInteractionRequest>({
            query: (body) => ({
                url: `/ai-interaction/${body.id}/apply-solid-ai-interaction`,
                method: "POST",
                // body,
            }),
        }),
    }),
});

export const {
    useTriggerMcpClientJobMutation,
    useApplySolidAiInteractionMutation,
} = aiInteractionApi;
