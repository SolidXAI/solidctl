import { useInitiateChangePasswordMutation } from "../../redux/api/authApi";
import { useFormik } from "formik";
import { useRouter } from "../../hooks/useRouter";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Toast } from "primereact/toast";
import { useEffect, useRef } from "react";
import * as Yup from "yup";
import { useSelector } from "react-redux";
import Image from "../common/Image";
import SolidLogo from '../../resources/images/SolidXLogo.svg'
import { ERROR_MESSAGES } from "../../constants/error-messages";
import { useLazyGetAuthSettingsQuery } from "../../redux/api/solidSettingsApi";
import showToast from "../../helpers/showToast";

const SolidForgotPassword = ({ signInValidatorLabel, signInValidatorPlaceholder }: any) => {
    const [trigger, { data: solidSettingsData }] = useLazyGetAuthSettingsQuery()

    useEffect(() => {
        trigger("") // Fetch settings on mount
    }, [trigger])

    const toast = useRef<Toast>(null);
    const router = useRouter();
    const [initiateChangePassword] = useInitiateChangePasswordMutation();
    const validationSchema = Yup.object({
        email: Yup.string()
            .email(ERROR_MESSAGES.FIELD_INAVLID_FORMAT('email'))
            .required(ERROR_MESSAGES.FIELD_REUQIRED('Email')),
    });
    function maskEmail(email: string) {
        const [localPart, domain] = email.split('@');
        const maskedLocal = localPart.slice(0, 3) + '*'.repeat(localPart.length - 3);
        const maskedDomain = domain.slice(-8).padStart(domain.length, '*');
        return `${maskedLocal}@${maskedDomain}`;
    }

    const formik = useFormik({
        initialValues: {
            email: "",
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                const payload = {
                    email: values.email,
                };
                const response = await initiateChangePassword(payload).unwrap();
                if (response?.statusCode === 200) {
                    const email = values?.email;
                    const maskedEmail = maskEmail(email);
                    router.push(`/auth/initiate-forgot-password-thank-you?email=${maskedEmail}`)
                } else (
                    showToast(toast, "error", ERROR_MESSAGES.ERROR, response.error)
                )
            } catch (err: any) {
                showToast(toast, "error", ERROR_MESSAGES.ERROR, err?.data ? err?.data?.message : ERROR_MESSAGES.SOMETHING_WRONG);
            }
        },
    });

    const isFormFieldValid = (formik: any, fieldName: string) =>
        formik.touched[fieldName] && formik.errors[fieldName];

    return (
        <>
            <Toast ref={toast} />
            <div className={`auth-container ${solidSettingsData?.data?.authPagesLayout === 'center' ? 'center' : 'side'}`}>
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
                <h2 className={`solid-auth-title ${solidSettingsData?.data?.authPagesLayout === 'center' ? 'text-center' : 'text-left'}`}>Forgot Password</h2>
                {/* <p className="solid-auth-subtitle text-sm">By continuing, you agree to the <Link href={'#'}>Terms of Service</Link> and acknowledge you’ve read our  <Link href={'#'}>Privacy Policy.</Link> </p> */}
                <form onSubmit={formik.handleSubmit}>
                    <div className="flex flex-column gap-2">
                        <label htmlFor="email" className="solid-auth-input-label">{signInValidatorLabel ? signInValidatorLabel : "Username or Email"}</label>
                        <InputText
                            id="email"
                            name="email"
                            placeholder={signInValidatorPlaceholder ? signInValidatorPlaceholder : "Email ID"}
                            value={formik.values.email}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                        />
                        {isFormFieldValid(formik, "email") && <Message
                            className="text-red-500 text-sm"
                            severity="error"
                            text={formik?.errors?.email?.toString()}
                        />}
                    </div>
                    <div className="mt-4">
                        <Button className="w-full font-light auth-submit-button" label="Continue" disabled={formik.isSubmitting} loading={formik.isSubmitting} />
                        <Button type="button" label="Back" className="w-full auth-back-button text-center mt-1" link onClick={() => (window.location.href = '/auth/login')} />
                    </div>
                </form>
            </div>
            {/* <div className="text-center mt-5">
                <div className="text-sm text-400 secondary-dark-color">
                    {'<'} Back to <Link className="font-bold" href="/auth/login">Sign In</Link>
                </div>
            </div> */}
        </>
    );
};

export default SolidForgotPassword;
