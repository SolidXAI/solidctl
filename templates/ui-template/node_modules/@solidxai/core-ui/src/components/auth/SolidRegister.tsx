import { useInitateRegisterMutation, useRegisterMutation } from "../../redux/api/authApi";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { Form, Formik } from "formik";
import Link from "../common/Link";
import { useRouter } from "../../hooks/useRouter";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Password } from "primereact/password";
import { TabPanel, TabView } from "primereact/tabview";
import { Toast } from "primereact/toast";
import { useEffect, useRef, useState } from "react";
import * as Yup from "yup";
import { SocialMediaLogin } from "../common/SocialMediaLogin";
import Image from "../common/Image";
import SolidLogo from '../../resources/images/SolidXLogo.svg'
import { formatTimeLeft } from "../../helpers/resendOtpHelper";
import { ProgressSpinner } from "primereact/progressspinner";
import { ERROR_MESSAGES } from "../../constants/error-messages";
import { useLazyGetAuthSettingsQuery } from "../../redux/api/solidSettingsApi";
import { env } from "../../adapters/env";
import showToast from "../../helpers/showToast";

interface AuthTabsProps {
    passwordBasedAuth: boolean;
    passwordLessAuth: boolean;
    showNameFieldsForRegistration?: boolean;
}

const SolidRegister = () => {
    const envPasswordHelperText = env("NEXT_PUBLIC_PASSWORD_COMPLEXITY_DESC");
    const [activeIndex, setActiveIndex] = useState(0);

    const [trigger, { data: solidSettingsData }] = useLazyGetAuthSettingsQuery();
    useEffect(() => {
        trigger("") // Fetch settings on mount
    }, [trigger])

    const [showOverlay, setShowOverlay] = useState(false);

    const toast = useRef<Toast>(null);

    const router = useRouter();

    const isFormFieldValid = (formik: any, fieldName: string) =>
        formik.touched[fieldName] && formik.errors[fieldName];

    const [register, { isLoading, error, isSuccess, data }] = useRegisterMutation();

    const [initiateRegister] = useInitateRegisterMutation();

    const showError = () => {
        if (error) {
            if ("data" in error) {
                const apiError = error as FetchBaseQueryError;
                // @ts-ignore
                const errorMessages = Array.isArray(apiError.data?.message) ? apiError.data?.message : [apiError.data?.message];
                toast.current?.show({
                    severity: "error",
                    summary: ERROR_MESSAGES.ERROR,
                    detail: errorMessages.join(", "),
                    sticky: true
                });
            } else {
                const serializedError = error as Error;
                toast.current?.show({
                    severity: "error",
                    summary: ERROR_MESSAGES.ERROR,
                    detail: serializedError.message || ERROR_MESSAGES.ERROR_OCCURED,
                    sticky: true
                });
            }
        }
    };

    useEffect(() => {
        if (error) {
            showError();
        }
    }, [error]);

    // useEffect(() => {
    //     if (isSuccess) {
    //             router.replace("/auth/login");
    //     }
    // }, [isSuccess])

    const PasswordSignup = ({ showNameFieldsForRegistration }: { showNameFieldsForRegistration?: boolean }) => {
        console.log("showNameFieldsForRegistration", showNameFieldsForRegistration);
        return (
            <Formik
                initialValues={{
                    username: "",
                    email: "",
                    password: "",
                    firstName: "",
                    lastName: ""
                }}

                validationSchema={Yup.object({
                    username: showNameFieldsForRegistration
                        ? Yup.string().notRequired()
                        : Yup.string().required(ERROR_MESSAGES.FIELD_REUQIRED('User Name')),

                    firstName: showNameFieldsForRegistration
                        ? Yup.string().required(ERROR_MESSAGES.FIELD_REUQIRED('First Name'))
                        : Yup.string().notRequired(),

                    lastName: showNameFieldsForRegistration
                        ? Yup.string().required(ERROR_MESSAGES.FIELD_REUQIRED('Last Name '))
                        : Yup.string().notRequired(),

                    email: Yup.string()
                        .email(ERROR_MESSAGES.FIELD_INVALID('email address'))
                        .required(ERROR_MESSAGES.FIELD_REUQIRED('Email')),
                    password: Yup.string()
                        .required(ERROR_MESSAGES.FIELD_REUQIRED('Password'))
                        .min(8, ERROR_MESSAGES.PASSWORD_CHARACTER(8))
                        .matches(/[a-z]/, ERROR_MESSAGES.PASSWORD_CONTAIN('lowercase'))
                        .matches(/[A-Z]/, ERROR_MESSAGES.PASSWORD_CONTAIN('uppercase'))
                        .matches(/\d/, ERROR_MESSAGES.PASSWORD_CONTAIN('one', 'number'))
                        .matches(/[@$!%*?&#^(){}[\]|\\/~`+=<>:;'"_,.-]/, ERROR_MESSAGES.PASSWORD_CONTAIN('special', 'character')),
                })}

                onSubmit={async (values, { setSubmitting }) => {
                    try {
                        let userData: any = {
                            email: values.email,
                            password: values.password,
                        };
                        if (showNameFieldsForRegistration) {
                            const fullName = `${values.firstName || ""} ${values.lastName || ""}`.trim();
                            const username = `${values.firstName || ""}${values.lastName || ""}`.trim().toLowerCase();
                            console.log("fullName, username", fullName, username);
                            userData = {
                                ...userData,
                                fullName,
                                username
                            };
                        } else {
                            userData = {
                                ...userData,
                                username: values.username,
                            };
                        }
                        const response = await register(userData).unwrap();

                        if (response?.statusCode === 200) {
                            showToast(toast, "success", ERROR_MESSAGES.USER_REGISTER, response?.data?.message);
                            setShowOverlay(true);
                            setTimeout(() => {
                                router.push(`/auth/login`);
                            }, 3000);
                        } else {
                            showToast(toast, "error", ERROR_MESSAGES.LOGIN_ERROR, response.error);
                        }
                    } catch (err: any) {
                        showToast(toast, "error", ERROR_MESSAGES.EMAIL_ALREADY_TAKEN, err?.data ? err?.data?.message : ERROR_MESSAGES.SOMETHING_WRONG);
                    } finally {
                        setSubmitting(false);
                    }
                }}
            >
                {(formik) => (
                    <Form>
                        {showNameFieldsForRegistration ? (
                            <>
                                {/* first + last name inline */}
                                <div className="flex gap-2 mt-3">
                                    <div className="flex flex-column w-full gap-2">
                                        <label className="solid-auth-input-label">First Name</label>
                                        <InputText
                                            id="firstName"
                                            name="firstName"
                                            placeholder="First Name"
                                            onChange={formik.handleChange}
                                            value={formik.values.firstName}
                                            invalid={!!formik.errors.firstName}
                                        />
                                        {isFormFieldValid(formik, "firstName") && (
                                            <Message severity="error" text={formik.errors.firstName?.toString()} />
                                        )}
                                    </div>

                                    <div className="flex flex-column w-full gap-2">
                                        <label className="solid-auth-input-label">Last Name</label>
                                        <InputText
                                            id="lastName"
                                            name="lastName"
                                            placeholder="Last Name"
                                            onChange={formik.handleChange}
                                            value={formik.values.lastName}
                                            invalid={!!formik.errors.lastName}
                                        />
                                        {isFormFieldValid(formik, "lastName") && (
                                            <Message severity="error" text={formik.errors.lastName?.toString()} />
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* username (only if name fields not shown) */}
                                <div>
                                    <div className="flex flex-column gap-2 mt-3">
                                        <label className="solid-auth-input-label">Username</label>
                                        <InputText
                                            id="username"
                                            name="username"
                                            placeholder="username"
                                            onChange={formik.handleChange}
                                            value={formik.values.username}
                                            invalid={!!formik.errors.username}
                                        />
                                    </div>
                                    {isFormFieldValid(formik, "username") &&
                                        <Message severity="error" text={formik.errors.username?.toString()} />}
                                </div>
                            </>
                        )}

                        {/* Email */}
                        <div>
                            <div className="flex flex-column gap-2 mt-3">
                                <label className="solid-auth-input-label">Email</label>
                                <InputText
                                    id="email"
                                    name="email"
                                    placeholder="Yourgmail@123.com"
                                    onChange={formik.handleChange}
                                    value={formik.values.email}
                                    invalid={!!formik.errors.email}
                                />
                            </div>
                            {isFormFieldValid(formik, "email") &&
                                <Message severity="error" text={formik.errors.email?.toString()} />}
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex flex-column gap-2 mt-3">
                                <label className="solid-auth-input-label">Password</label>
                                <Password
                                    id="password"
                                    name="password"
                                    value={formik.values.password}
                                    onChange={formik.handleChange}
                                    toggleMask
                                    inputClassName="w-full"
                                    feedback={false}
                                    invalid={!!formik.errors.password}
                                />
                            </div>
                            {isFormFieldValid(formik, "password") &&
                                <Message severity="error" text={formik.errors.password?.toString()} />}
                        </div>
                        {/* <SolidPasswordHelperText text={solidSettingsData?.data?.authenticationPasswordComplexityDescription} /> */}
                        <div className="mt-4">
                            <Button className="w-full font-light auth-submit-button" label="Sign Up" disabled={formik.isSubmitting} loading={formik.isSubmitting} />
                        </div>
                    </Form>
                )}
            </Formik>
        )
    }

    const PasswordLessSignup = () => {
        return (
            <Formik
                initialValues={{
                    username: "",
                    email: "",
                }}
                validationSchema={Yup.object({
                    username: Yup.string().required(ERROR_MESSAGES.FIELD_REUQIRED('"User Name')),
                    email: Yup.string()
                        .email(ERROR_MESSAGES.FIELD_INVALID('email address'))
                        .required(ERROR_MESSAGES.FIELD_REUQIRED('Email')),
                })}
                onSubmit={async (values, { setSubmitting }) => {
                    try {
                        const RESEND_OTP_KEY = `resendOtpRegister_${values.email}`;
                        const RESEND_OTP_TIMER_MIN = parseFloat(env("NEXT_PUBLIC_RESEND_OTP_TIMER") || '0.5');
                        const RESEND_OTP_TIMER = Math.round(RESEND_OTP_TIMER_MIN * 60);
                        const payload = {
                            username: values.username,
                            email: values.email,
                            validationSources: ["email"]
                        };
                        const storedTimeStr = localStorage.getItem(RESEND_OTP_KEY);
                        const now = Date.now();
                        if (storedTimeStr) {
                            const lastSent = parseInt(storedTimeStr, 10);
                            const elapsed = Math.floor((now - lastSent) / 1000);
                            const remaining = RESEND_OTP_TIMER - elapsed;

                            if (remaining > 0) {
                                const formatted = formatTimeLeft(remaining);
                                showToast(toast, 
                                    "error",
                                    ERROR_MESSAGES.PLEASE_WAIT,
                                    ERROR_MESSAGES.OPT_FORMAT(formatted)
                                );
                                setSubmitting(false);
                                return; //  Prevent request
                            }
                        }
                        const response = await initiateRegister(payload).unwrap(); // Call mutation trigger

                        if (response?.statusCode === 200) {
                            showToast(toast, "success", ERROR_MESSAGES.OPT_SEND, response?.data?.message);
                            const email = values.email;
                            localStorage.setItem(`resendOtpRegister_${email}`, Date.now().toString());
                            router.push(`/auth/initiate-register?email=${email}&username=${values.username}`);
                        } else {
                            showToast(toast, "error", ERROR_MESSAGES.LOGIN_ERROR, response.error);
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
                        <div className="flex flex-column gap-2 mt-3">
                            <label htmlFor="email" className="solid-auth-input-label">Username</label>
                            <InputText
                                id="username"
                                name="username"
                                placeholder="username"
                                onChange={formik.handleChange}
                                value={formik.values.username}
                                invalid={!!formik.errors.username}
                            />
                            {isFormFieldValid(formik, "username") && <Message
                                className="text-red-500 text-sm"
                                severity="error"
                                text={formik?.errors?.username?.toString()}
                            />}
                        </div>
                        <div className="flex flex-column gap-2 mt-3">
                            <label htmlFor="email" className="solid-auth-input-label">Email</label>
                            <InputText
                                id="email"
                                name="email"
                                placeholder="Yourgmail@123.com"
                                onChange={formik.handleChange}
                                value={formik.values.email}
                                invalid={!!formik.errors.email}
                            />
                            {isFormFieldValid(formik, "email") && <Message
                                className="text-red-500 text-sm"
                                severity="error"
                                text={formik?.errors?.email?.toString()}
                            />}
                        </div>
                        <div className="mt-4">
                            <Button className="w-full font-light auth-submit-button" label="Sign Up" disabled={formik.isSubmitting} loading={formik.isSubmitting} />
                        </div>
                    </Form>
                )}
            </Formik>
        )
    }

    const AuthTabs: React.FC<AuthTabsProps> = ({ passwordBasedAuth, passwordLessAuth, showNameFieldsForRegistration }) => {
        if (passwordBasedAuth && passwordLessAuth) {
            return (
                <TabView className="solid-auth-tabview"
                    activeIndex={activeIndex}
                    onTabChange={(e) => setActiveIndex(e.index)}
                >
                    <TabPanel header="With Password">
                        <PasswordSignup showNameFieldsForRegistration={showNameFieldsForRegistration} />
                    </TabPanel>
                    <TabPanel header="Without Password">
                        <PasswordLessSignup />
                    </TabPanel>
                </TabView>
            );
        } else if (passwordBasedAuth) {
            return <PasswordSignup showNameFieldsForRegistration={showNameFieldsForRegistration} />;
        } else if (passwordLessAuth) {
            return <PasswordLessSignup />;
        } else {
            return <p>No authentication method available</p>;
        }
    };
    return (
        <div className="">
            <Toast ref={toast} />
            {/* 🔹 Overlay UI */}
            <div className={`auth-container position-relative ${solidSettingsData?.data?.authPagesLayout === 'center' ? 'center' : 'side'}`}>
                {showOverlay && (
                    <div className="absolute top-0 left-0 w-full h-full flex align-items-center justify-content-center register-success-popup">
                        <div className="inline-flex flex-column align-items-center justify-content-center text-center">
                            <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="4" />
                            <p className="mt-3 text-lg font-medium text-700">
                                Registration successful,<br />you will be redirected...
                            </p>
                        </div>
                    </div>
                )}
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
                <h2 className={`solid-auth-title ${solidSettingsData?.data?.authPagesLayout === 'center' ? 'text-center mt-2 md:mt-4' : 'text-left'}`}>Sign Up</h2>
                {/* <p className="solid-auth-subtitle text-sm">By continuing, you agree to the <Link href={'#'}>Terms of Service</Link> and acknowledge you’ve read our  <Link href={'#'}>Privacy Policy.</Link> </p> */}
                <AuthTabs passwordBasedAuth={solidSettingsData?.data?.passwordBasedAuth} passwordLessAuth={solidSettingsData?.data?.passwordLessAuth} showNameFieldsForRegistration={solidSettingsData?.data?.showNameFieldsForRegistration} />
                {solidSettingsData?.data?.iamGoogleOAuthEnabled &&
                    <>
                        <Divider align="center">
                            <div className="inline-flex align-items-center">
                                or
                            </div>
                        </Divider>
                        <SocialMediaLogin />
                    </>
                }
            </div>
            <div className="text-center mt-3 md:mt-4">
                <div className="text-sm text-400 secondary-dark-color">
                    Already have an account ? <Link className="font-bold" href="/auth/login">Sign In</Link>
                </div>
            </div>
        </div>
    );
};

export default SolidRegister;
