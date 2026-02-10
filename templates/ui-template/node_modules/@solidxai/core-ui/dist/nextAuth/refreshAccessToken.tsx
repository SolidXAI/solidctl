import { ERROR_MESSAGES } from "../constants/error-messages";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

export async function refreshAccessToken(token: any) {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/iam/refresh-tokens`,
        { refreshToken: token.refreshToken }
      );
  
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
        // ...token,
        error: "RefreshAccessTokenError",
      };
    }
  }