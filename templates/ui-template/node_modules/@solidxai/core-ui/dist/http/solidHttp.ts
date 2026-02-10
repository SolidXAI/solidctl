import axios from "axios";
import { env } from "../adapters/env";
import { getSession } from "../adapters/auth";
import { eventBus, AppEvents } from "../helpers/eventBus";

const baseURL = `${env("NEXT_PUBLIC_BACKEND_API_URL")}/api`;

/**
 * solidAxios is a preconfigured Axios instance with:
 * - baseURL from NEXT_PUBLIC_BACKEND_API_URL (VITE_BACKEND_API_URL in Vite)
 * - Authorization header injected from getSession()
 * - Global error event emission on network/5xx failures
 *
 * Usage:
 *   import { solidAxios } from "@solidxai/core-ui";
 *   const res = await solidAxios.get("/setting/wrapped");
 */
export const solidAxios = axios.create({
  baseURL,
});

solidAxios.interceptors.request.use(async (config) => {
  if (config.url && config.url.startsWith("/api")) {
    const stripped = config.url.replace(/^\/api(\/|$)/, "/");
    config.url = stripped === "" ? "/" : stripped;
  }
  const session = await getSession();
  if (session?.user?.accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${session.user.accessToken}`;
  }
  return config;
});

solidAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const isNetwork = !status || status >= 500;
    if (isNetwork) {
      eventBus.emit(AppEvents.GlobalError, {
        status: status ?? "FETCH_ERROR",
        message: "Unable to reach the server. Please try again later.",
        error,
      });
    }
    return Promise.reject(error);
  }
);

export const solidGet = solidAxios.get;
export const solidPost = solidAxios.post;
export const solidPut = solidAxios.put;
export const solidPatch = solidAxios.patch;
export const solidDelete = solidAxios.delete;

/**
 * Convenience methods when you don't want to import the instance.
 *
 * Usage:
 *   import { solidGet, solidPost } from "@solidxai/core-ui";
 *   const res = await solidGet("/setting/wrapped");
 */
