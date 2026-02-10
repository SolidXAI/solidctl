import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError, FetchBaseQueryMeta } from "@reduxjs/toolkit/query/react";
import { getSession } from "../../adapters/auth/index";
import { env } from "../../adapters/env";
import { logger } from "../../helpers/logger";
import { eventBus, AppEvents } from "../../helpers/eventBus";

// Base URL for the API endpoints
const baseUrl = `${env("NEXT_PUBLIC_BACKEND_API_URL")}/api`;
logger.debug(`fetchBaseQuery resolved baseUrl to ${baseUrl}`);


const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  prepareHeaders: async (headers) => {
    // Fetch session data
    const session = await getSession();
    if (session?.user?.accessToken) {
      // Add access token to headers
      headers.set('authorization', `Bearer ${session?.user?.accessToken}`);
    }

    if (session?.user?.accessToken) {
      headers.set("authorization", `Bearer ${session.user.accessToken}`);
      logger.debug("[prepareHeaders] set auth header");
    } else {
      logger.debug("[prepareHeaders] no access token");
    }

    logger.debug("[prepareHeaders] end");
    return headers;
  },
});

export const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  {},
  FetchBaseQueryMeta
> = async (
  args,
  api,
  extraOptions
) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error) {
    const status = (result.error as any).status;
    const isNetwork =
      status === "FETCH_ERROR" ||
      status === "PARSING_ERROR" ||
      (typeof status === "number" && status >= 500);

    if (isNetwork) {
      eventBus.emit(AppEvents.GlobalError, {
        status,
        message: "Unable to reach the server. Please try again later.",
        error: result.error,
      });
    }
  }

  return result;
};
