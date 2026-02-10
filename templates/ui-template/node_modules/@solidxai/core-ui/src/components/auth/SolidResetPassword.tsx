import { useConfirmForgotPasswordMutation } from "../../redux/api/authApi";
import { useFormik } from "formik";
import Image from "../common/Image";
import { useRouter } from "../../hooks/useRouter";
import { useSearchParams } from "../../hooks/useSearchParams";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Password } from "primereact/password";
import { Toast } from "primereact/toast";
import { classNames } from "primereact/utils";
import { useEffect, useRef } from "react";
import * as Yup from "yup";
import SolidLogo from '../../resources/images/SolidXLogo.svg'
import { ERROR_MESSAGES } from "../../constants/error-messages";
import { useLazyGetAuthSettingsQuery } from "../../redux/api/solidSettingsApi";
import { env } from "../../adapters/env";
import showToast from "../../helpers/showToast";

const SolidResetPassword = () => {
    const searchParams = useSearchParams();
    const verificationToken = searchParams.get('token');
    // const decodedUsername = searchParams.get('username');
    // const username = decodedUsername ? decodeURIComponent(decodedUsername) : '';

    const [trigger, { data: solidSettingsData }] = useLazyGetAuthSettingsQuery();
    useEffect(() => {
        trigger("") // Fetch settings on mount
    }, [trigger])


    const toast = useRef<Toast>(null);
    const router = useRouter();

    const [confirmForgotPassword] = useConfirmForgotPasswordMutation();

    const envPasswordRegex = env("NEXT_PUBLIC_PASSWORD_REGEX");
    const envPasswordHelperText = env("NEXT_PUBLIC_PASSWORD_COMPLEXITY_DESC");
    let passwordRegex: RegExp | null = null;
    try {
        if (envPasswordRegex) {
            const unescaped = JSON.parse(`"${envPasswordRegex}"`);
            passwordRegex = new RegExp(unescaped);
        }
    } catch (error) {
        console.error(ERROR_MESSAGES.INVALID_PASSWORD_REGX, error);
    }

    const newPasswordValidation = passwordRegex
        ? Yup.string()
            .matches(passwordRegex, ERROR_MESSAGES.PASSWORD_DO_NOT_MEET)
            .required(ERROR_MESSAGES.FIELD_REUQIRED('New password'))
        : Yup.string().min(6, ERROR_MESSAGES.PASSWORD_CHARACTER(6))
            .required('New password is required');

    const validationSchema = Yup.object({
        password: newPasswordValidation,
        confirmPassword: Yup.string().oneOf([Yup.ref('password')], ERROR_MESSAGES.MUST_MATCH).required(ERROR_MESSAGES.FIELD_REUQIRED('Confirm password')),
    });

    const formik = useFormik({
        initialValues: {
            // username: username,
            password: "",
            confirmPassword: "",
            verificationToken: verificationToken,
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                const payload = {
                    // username: values.username,
                    password: values.password,
                    verificationToken: values.verificationToken,
                };
                const response = await confirmForgotPassword(payload).unwrap();
                if (response?.statusCode === 200) {
                    showToast(toast, "success", ERROR_MESSAGES.FIELD_UPDATE('Password'), ERROR_MESSAGES.FIELD_UPDATE_SUCCESSFULLY('Password'))
                    router.push('/auth/login');
                } else (
                    showToast(toast, "error", ERROR_MESSAGES.ERROR, response.error)
                )
            } catch (err: any) {
                showToast(toast, "error", err?.data?.message, err?.data?.data?.message ? err?.data?.data?.message : err?.data?.message);
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
                <h2 className={`solid-auth-title ${solidSettingsData?.data?.authPagesLayout === 'center' ? 'text-center' : 'text-left'}`}>Create New Password</h2>
                {/* <p className="solid-auth-subtitle text-sm">By continuing, you agree to the <Link href={'#'}>Terms of Service</Link> and acknowledge you’ve read our  <Link href={'#'}>Privacy Policy.</Link> </p> */}
                <form onSubmit={formik.handleSubmit}>
                    <div className="flex flex-column gap-2">
                        <label htmlFor="password" className="solid-auth-input-label">New Password</label>
                        <Password
                            id="password"
                            name="password"
                            placeholder="***************"
                            value={formik.values.password}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            toggleMask
                            className={classNames("", {
                                "p-invalid": isFormFieldValid(formik, "password"),
                            })}
                            inputClassName="w-full"
                            feedback={false}
                        />
                        {isFormFieldValid(formik, "password") && <Message
                            className="text-red-500 text-sm"
                            severity="error"
                            text={formik?.errors?.password?.toString()}
                        />}
                    </div>
                    <div className="flex flex-column gap-1 mt-4" style={{}}>
                        <label htmlFor="password" className="solid-auth-input-label">Confirm Password</label>
                        <Password
                            id="confirmPassword"
                            name="confirmPassword"
                            placeholder="***************"
                            value={formik.values.confirmPassword}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            toggleMask
                            className={classNames("", {
                                "p-invalid": isFormFieldValid(formik, "confirmPassword"),
                            })}
                            inputClassName="w-full"
                            feedback={false}
                        />
                        {isFormFieldValid(formik, "confirmPassword") && <Message
                            className="text-red-500 text-sm"
                            severity="error"
                            text={formik?.errors?.confirmPassword?.toString()}
                        />}
                    </div>
                    {envPasswordHelperText && (
                        <div className="mt-4 text-sm">
                            <div className="grid">
                                {envPasswordHelperText
                                    .split('\\n')
                                    .map((text, idx) => (
                                        <div key={idx} className="col-6 pt-0">
                                            <div className='flex gap-2'><span>•</span><span>{text}</span></div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                    {/* <div className="flex align-items-center mt-4">
                                        <Checkbox inputId="remember" onChange={(e: any) => setChecked(e.checked)} checked={checked} />
                                        <label htmlFor="remember" className="ml-2">Remember me</label>
                                    </div> */}
                    <div className="mt-4">
                        <Button className="w-full font-light auth-submit-button" label="Reset Password" disabled={formik.isSubmitting} loading={formik.isSubmitting} />
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

export default SolidResetPassword;
