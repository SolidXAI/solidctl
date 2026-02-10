import { useConfirmOtpRegisterMutation, useInitateRegisterMutation } from "../../redux/api/authApi";
import { Form, Formik } from "formik";
import Image from "../common/Image";
import { useRouter } from "../../hooks/useRouter";
import { useSearchParams } from "../../hooks/useSearchParams";
import { Button } from "primereact/button";
import { InputOtp } from "primereact/inputotp";
import { Message } from "primereact/message";
import { Toast } from "primereact/toast";
import { useEffect, useRef, useState } from "react";
import * as Yup from "yup";
import SolidLogo from '../../resources/images/SolidXLogo.svg'
import { ERROR_MESSAGES } from "../../constants/error-messages";
import { useLazyGetAuthSettingsQuery } from "../../redux/api/solidSettingsApi";
import { env } from "../../adapters/env";
import showToast from "../../helpers/showToast";

const SolidInitiateRegisterOtp = () => {
    const searchParams = useSearchParams();
    const tempEmail = searchParams.get('email');
    const email = tempEmail ? decodeURIComponent(tempEmail) : '';
    const RESEND_OTP_KEY = `resendOtpRegister_${email}`;
    const RESEND_OTP_TIMER_MIN = parseFloat(env("NEXT_PUBLIC_RESEND_OTP_TIMER") || '0.5');
    const RESEND_OTP_TIMER = Math.round(RESEND_OTP_TIMER_MIN * 60);
    const username = searchParams.get('username') || '';
    const [trigger, { data: solidSettingsData }] = useLazyGetAuthSettingsQuery();
    useEffect(() => {
        trigger("") // Fetch settings on mount
    }, [trigger])


    const [initiateResendOTP] = useInitateRegisterMutation();
    const [initiateOtpRegister] = useConfirmOtpRegisterMutation();
    const toast = useRef<Toast>(null);
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState(RESEND_OTP_TIMER);
    const [resendEnabled, setResendEnabled] = useState(false);

    useEffect(() => {

        // Set timer if not already set (e.g., after login)
        const storedTime = localStorage.getItem(RESEND_OTP_KEY);
        if (!storedTime) {
            localStorage.setItem(RESEND_OTP_KEY, Date.now().toString());
        }

        const lastSent = storedTime ? parseInt(storedTime, 10) : Date.now();
        const elapsed = Math.floor((Date.now() - lastSent) / 1000);
        const remaining = RESEND_OTP_TIMER - elapsed;

        if (remaining > 0) {
            setTimeLeft(remaining);
            setResendEnabled(false);
        } else {
            setTimeLeft(0);
            setResendEnabled(true);
        }
    }, [email]);

    useEffect(() => {
        if (resendEnabled || timeLeft <= 0) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setResendEnabled(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [resendEnabled, timeLeft]);

    const validationSchema = Yup.object({
        otp: Yup.string()
            .matches(/^\d{6}$/, ERROR_MESSAGES.OTP_CHARACTER(6))
            .required(ERROR_MESSAGES.FIELD_REUQIRED('OTP')),
    });

    const isFormFieldValid = (formik: any, fieldName: string) =>
        formik.touched[fieldName] && formik.errors[fieldName];

    const handleResendOtp = async () => {
        try {
            const payload = {
                username: username,
                email: email,
                validationSources: ["email"]
            };

            const response = await initiateResendOTP(payload).unwrap();

            if (response?.statusCode === 200) {
                showToast(toast, "success", ERROR_MESSAGES.OPT_RESEND, response?.data?.message);
                localStorage.setItem(RESEND_OTP_KEY, Date.now().toString());
                setTimeLeft(RESEND_OTP_TIMER);
                setResendEnabled(false);
            } else {
                showToast(toast, "error", ERROR_MESSAGES.LOGIN_ERROR, response.error);
            }
        } catch (err: any) {
            showToast(toast, "error", ERROR_MESSAGES.LOGIN_ERROR, err?.data?.message || ERROR_MESSAGES.SOMETHING_WRONG);
        }
    };

    return (
        <>
            <Toast ref={toast} />
            <div className={`auth-container ${solidSettingsData?.data?.authPagesLayout === 'center' ? 'center' : 'side'}`} style={{ minWidth: 480 }}>
                {solidSettingsData?.data?.authPagesLayout === 'center' &&
                    <div className="flex justify-content-center">
                        <div className={`solid-logo flex align-items-center ${solidSettingsData?.data?.appLogoPosition}`}>
                            <Image
                                alt="solid logo"
                                src={solidSettingsData?.data?.appLogo || SolidLogo}
                                className="relative"
                                fill
                            />
                        </div>
                    </div>
                }
                <h2 className={`solid-auth-title ${solidSettingsData?.data?.authPagesLayout === 'center' ? 'text-center' : 'text-left'}`}>OTP Verification</h2>
                <p className="solid-auth-subtitle text-sm">
                    Please enter the OTP sent to your email to complete verification
                </p>
                <>
                    <Formik
                        initialValues={{
                            otp: "",
                        }}
                        validationSchema={validationSchema}
                        onSubmit={async (values, { setSubmitting, setErrors }) => {
                            try {
                                const payload = {
                                    type: "email",
                                    identifier: email,
                                    otp: values.otp
                                };

                                const response = await initiateOtpRegister(payload).unwrap(); // Call mutation trigger

                                if (response?.statusCode === 200) {
                                    localStorage.removeItem(`resendOtpRegister_${email}`);
                                    showToast(toast, "success", ERROR_MESSAGES.LOGIN_SUCCESSFULLY, "Login");
                                    router.push(`/auth/login`);
                                } else {
                                    showToast(toast, "error", ERROR_MESSAGES.INAVLID_OTP, response.error);
                                    setErrors({
                                        otp: ERROR_MESSAGES.INAVLID_OTP,
                                    });
                                }
                            } catch (err: any) {
                                showToast(toast, "error", ERROR_MESSAGES.LOGIN_ERROR, err?.data ? err?.data?.message : ERROR_MESSAGES.SOMETHING_WRONG);
                            } finally {
                                setSubmitting(false);
                            }
                        }}
                    >
                        {(formik) => (
                            <Form>
                                <div className="flex flex-column gap-2">
                                    <label htmlFor="otp" className="solid-auth-input-label">Enter OTP</label>
                                    <InputOtp
                                        value={formik.values.otp}
                                        onChange={(e) => formik.setFieldValue("otp", e.value)}
                                        length={6}
                                        style={{ width: '100%' }}
                                        invalid={!!formik.errors.otp}
                                    />
                                    {isFormFieldValid(formik, "otp") && (
                                        <Message className="text-red-500 text-sm" severity="error" text={formik.errors.otp?.toString()} />
                                    )}
                                    <div className="flex align-items-center justify-content-between">
                                        <Button type="button" icon='pi pi-refresh' iconPos="left" link label="Resend Code" className="px-0 text-sm font-normal"
                                            onClick={handleResendOtp}
                                            disabled={!resendEnabled}
                                        />
                                        <p className="m-0 text-sm text-color">
                                            {resendEnabled
                                                ? "You can resend now"
                                                : `Time left: ${Math.floor(timeLeft / 60)
                                                    .toString()
                                                    .padStart(2, "0")}:${(timeLeft % 60).toString().padStart(2, "0")}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <Button type="submit" className="w-full font-light auth-submit-button" label="Verify" disabled={formik.isSubmitting} loading={formik.isSubmitting} />
                                    <Button type="button" label="Back" className="w-full auth-back-button text-center mt-1" link onClick={() => (window.location.href = '/auth/login')} />
                                </div>
                            </Form>
                        )}
                    </Formik>
                </>
            </div>
            {/* <div className="text-center mt-5">
            <div className="text-sm text-400 secondary-dark-color">
                {'<'} Back to <Link className="font-bold" href="/auth/login">Sign In</Link>
            </div>
        </div> */}
        </>
    );
};

export default SolidInitiateRegisterOtp;
