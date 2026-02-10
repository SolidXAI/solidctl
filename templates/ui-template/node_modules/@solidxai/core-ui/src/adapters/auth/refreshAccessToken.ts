import axios from "axios";
import { ERROR_MESSAGES } from "../../constants/error-messages";
import { jwtDecode } from "jwt-decode";
import { env } from "../env";

// NOTE: Use a dedicated Axios instance with no interceptors to avoid recursion.
// solidAxios injects getSession() in its interceptor, which can trigger a refresh loop
// when refreshAccessToken itself uses solidAxios.
const refreshAxios = axios.create({
  baseURL: `${env("NEXT_PUBLIC_BACKEND_API_URL")}/api`,
});

export async function refreshAccessToken(token: any) {
  try {
    const response = await refreshAxios.post("/iam/refresh-tokens", {
      refreshToken: token.refreshToken,
    });

    const { accessToken, refreshToken } = response.data.data;
    const { exp: accessTokenExpires } = jwtDecode<{ exp: number }>(accessToken);

    return {
      ...token,
      accessToken,
      refreshToken,
      accessTokenExpires: accessTokenExpires * 1000, // Convert seconds to milliseconds
    };
  } catch (error: any) {
    console.error(ERROR_MESSAGES.FAILED_REFRESH_TOKEN, error.message || error.response?.data);
    return {
      error: "RefreshAccessTokenError",
    };
  }
}
