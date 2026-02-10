import { ERROR_MESSAGES } from '../../constants/error-messages';
import { signInWithOAuthAccessCode } from "../../adapters/auth/index";
import { useRouter } from "../../hooks/useRouter";
import { useSearchParams } from "../../hooks/useSearchParams";
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { useEffect, useRef, useState } from 'react'
import { env } from "../../adapters/env";
import showToast from "../../helpers/showToast";

export const GoogleAuthChecking = () => {
    const searchParams = useSearchParams();
    const accessCode = searchParams.get("accessCode");

    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const toast = useRef<Toast>(null);
    useEffect(() => {
        const handleOAuthAuthentication = async () => {
            if (!accessCode) {
                showToast(toast, "error", ERROR_MESSAGES.LOGIN_ERROR, ERROR_MESSAGES.AUTHENICATION__FAILED);
                setError(ERROR_MESSAGES.AUTHENICATION__FAILED);
                return;
            }

            try {
                const response = await signInWithOAuthAccessCode({
                    accessCode: accessCode,
                });

                if (response?.error) {
                    showToast(toast, "error", ERROR_MESSAGES.LOGIN_ERROR, response.error);
                    setError(ERROR_MESSAGES.AUTHENICATION__FAILED)
                } else {
                    showToast(toast, "success", ERROR_MESSAGES.LOGIN_SUCCESS, ERROR_MESSAGES.DASHBOARD_REDIRECTING);
                    const redirectUrl = env("NEXT_PUBLIC_LOGIN_REDIRECT_URL") || "/admin";
                    router.push(redirectUrl);
                }
            } catch (err: any) {
                showToast(toast, "error", ERROR_MESSAGES.LOGIN_ERROR, err?.data?.message || ERROR_MESSAGES.AUTHENICATION__FAILED);
            }
        };

        handleOAuthAuthentication();
    }, [accessCode, router]);

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <h2 className="text-red-500 text-xl font-semibold">{error}</h2>
            </div>
        );
    }
    return (
        <div>
            <Toast ref={toast} />
            <ProgressSpinner />
        </div>
    )
}
