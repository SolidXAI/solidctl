"use client";

import { Form, Formik } from "formik";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { InputOtp } from "primereact/inputotp";
import { Message } from "primereact/message";
import { Toast } from "primereact/toast";
import { useEffect, useRef, useState } from "react";
import * as Yup from "yup";
import Image from "next/image";
import SolidLogo from '../../resources/images/SolidXLogo.svg'
import { ERROR_MESSAGES } from "../../constants/error-messages";
import { useLazyGetAuthSettingsQuery } from "../../redux/api/solidSettingsApi";

const SolidOTPVerify = () => {

    const [trigger, { data: solidSettingsData }] = useLazyGetAuthSettingsQuery();
    useEffect(() => {
        trigger("") // Fetch settings on mount
    }, [trigger])

    const [otp, setOTP] = useState<number | any>();

    const toast = useRef<Toast>(null);
    const router = useRouter();

    const [password, setPassword] = useState('');
    const [checked, setChecked] = useState<boolean>(false);

    const validationSchema = Yup.object({
        email: Yup.string()
            .email(ERROR_MESSAGES.FIELD_INVALID(' email address'))
            .required(ERROR_MESSAGES.FIELD_REUQIRED('Email')),
    });

    const showToast = (severity: "success" | "error", summary: string, detail: string) => {
        toast.current?.show({
            severity,
            summary,
            detail,
            ...(severity === "error"
                ? { sticky: true }            // stays until user closes
                : { life: 3000 }),
        });
    };

    const isFormFieldValid = (formik: any, fieldName: string) =>
        formik.touched[fieldName] && formik.errors[fieldName];

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
                            email: "",
                            password: "",
                        }}
                        validationSchema={validationSchema}
                        onSubmit={async (values) => {
                            // Handle form submission
                            const email = values.email;
                            const password = values.password;

                            const response = await signIn("credentials", {
                                redirect: false,
                                email,
                                password,
                            });
                            if (response?.error) {
                                showToast("error", ERROR_MESSAGES.LOGIN_ERROR, response.error);
                            } else {
                                showToast("success", ERROR_MESSAGES.LOGIN_SUCCESS, ERROR_MESSAGES.DASHBOARD_REDIRECTING);
                                router.push(`${process.env.NEXT_PUBLIC_LOGIN_REDIRECT_URL}`);
                            }

                        }}
                    >
                        {(formik) => (
                            <Form>
                                <div className="flex flex-column gap-2 px-3">
                                    <label htmlFor="email" className="solid-auth-input-label">Enter OTP</label>
                                    <InputOtp value={otp} onChange={(e) => setOTP(e.value)} length={6} style={{ width: '100%' }} />
                                    {isFormFieldValid(formik, "email") && <Message
                                        className="text-red-500 text-sm"
                                        severity="error"
                                        text={formik?.errors?.email?.toString()}
                                    />}
                                    <div className="flex align-items-center justify-content-between">
                                        <Button type="button" icon='pi pi-refresh' iconPos="left" link label="Resend Code" className="px-0 text-sm font-normal" />
                                        <p className="m-0 text-sm text-color">
                                            Time left: 00:28
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <Button type="submit" className="w-full font-light auth-submit-button" label="Verify" disabled={formik.isSubmitting} loading={formik.isSubmitting} />
                                </div>
                            </Form>
                        )}
                    </Formik>
                </>
            </div>
            <div className="text-center mt-5">
                <div className="text-sm text-400 secondary-dark-color">
                    {'<'} Back to <Link className="font-bold" href="/auth/login">Sign In</Link>
                </div>
            </div>
        </>
    );
};

export default SolidOTPVerify;