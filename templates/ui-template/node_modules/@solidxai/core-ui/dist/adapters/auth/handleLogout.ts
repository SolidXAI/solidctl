import { ERROR_MESSAGES } from "../../constants/error-messages";
import { getSession, signOut } from "./index";
import { solidPost } from "../../http/solidHttp";

export async function handleLogout({ toast }: any) {
    const session = await getSession();
    const refreshToken = session?.user?.refreshToken;
    try {
        const response = await solidPost(
            "/iam/logout",
            {
                refreshToken: refreshToken, // Pass refresh token in body
            }
        );
        console.log("logout response", response);

        if (response?.data?.statusCode === 200) {
            await signOut({ callbackUrl: '/auth/login' });
        } else {
            toast?.current?.show({
                severity: 'error',
                summary: ERROR_MESSAGES.LOGOUT_FAILED,
                detail: `${response?.data?.data?.status}`,
                life: 3000,
            });
        }
    } catch (error) {
        const err = error as any;
        const message =
            err.response?.data?.data?.message || err.message || ERROR_MESSAGES.LOGOUT_FAILED;

        toast?.current?.show({
            severity: 'error',
            summary: ERROR_MESSAGES.LOGOUT_FAILED,
            detail: message,
            life: 3000,
        });
    }
}
