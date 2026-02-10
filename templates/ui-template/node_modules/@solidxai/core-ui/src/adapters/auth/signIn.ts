import { jwtDecode } from "jwt-decode";
import { env } from "../env";
import { saveSession } from "./storage";
import { eventBus, AppEvents } from "../../helpers/eventBus";
import { solidPost } from "../..//http/solidHttp";

type SignInResponse = {
  ok: boolean;
  error: string | null;
  status: number;
  url: string | null;
};

export async function signIn(provider: string, options: any = {}): Promise<SignInResponse> {
  if (provider !== "credentials") {
    return { ok: false, error: `Unsupported provider: ${provider}`, status: 400, url: null };
  }

  const { identifier, password } = options;
  const apiUrl = env("API_URL");

  if (!apiUrl) {
    return { ok: false, error: "API_URL is not configured", status: 500, url: null };
  }

  try {
    const response = await solidPost(
      `${apiUrl}/api/iam/authenticate`,
      {
        username: identifier,
        email: identifier.includes('@') ? identifier : null,
        password,
      },
      {
        headers: {
          accept: "*/*",
          "Content-Type": "application/json",
        },
      }
    );

    const accessToken = response?.data?.data?.accessToken;
    const refreshToken = response?.data?.data?.refreshToken;
    const user = response?.data?.data?.user || {};

    if (!accessToken || !refreshToken) {
      return { ok: false, error: "Missing tokens in response", status: response.status || 500, url: null };
    }

    const decoded = jwtDecode<{ exp?: number }>(accessToken);
    const accessTokenExpires = decoded.exp ? decoded.exp * 1000 : undefined;

    const session = {
      user: {
        ...user,
        accessToken,
        refreshToken,
        accessTokenExpires,
      },
      error: null,
    };
    saveSession(session);
    eventBus.emit(AppEvents.SessionUpdated, session);

    return { ok: true, error: null, status: response.status || 200, url: null };
  } catch (error: any) {
    const message = error?.response?.data?.message || error?.response?.data?.data?.message || error?.message || "Login failed";
    return { ok: false, error: message, status: error?.response?.status || 500, url: null };
  }
}
