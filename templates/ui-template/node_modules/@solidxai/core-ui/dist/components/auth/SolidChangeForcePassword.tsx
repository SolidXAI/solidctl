import { ERROR_MESSAGES } from '../../constants/error-messages';
import { useChangePasswordMutation } from '../../redux/api/authApi';
import { useFormik } from 'formik';
import { signOut } from "../../adapters/auth/index";
import { useSession } from "../../hooks/useSession";
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Password } from 'primereact/password';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import * as Yup from 'yup';
import { env } from "../../adapters/env";
import showToast from "../../helpers/showToast";

const SolidChangeForcePassword = () => {
    const toast = useRef<Toast>(null);
    const [changePassword] = useChangePasswordMutation();

    const session: any = useSession();

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
            .required(ERROR_MESSAGES.FIELD_REUQIRED('New password'));

    const validationSchema = Yup.object({
        email: Yup.string().email(ERROR_MESSAGES.FIELD_INAVLID_FORMAT('email')).required(ERROR_MESSAGES.FIELD_REUQIRED('Email')),
        currentPassword: Yup.string().min(6, ERROR_MESSAGES.PASSWORD_CHARACTER(6)).required(ERROR_MESSAGES.FIELD_REUQIRED('Current password')),
        newPassword: newPasswordValidation,
        confirmPassword: Yup.string()
            .oneOf([Yup.ref('newPassword')], ERROR_MESSAGES.MUST_MATCH)
            .required(ERROR_MESSAGES.FIELD_REUQIRED('Confirm password')),
        id: Yup.number().required(ERROR_MESSAGES.FIELD_REUQIRED('User ID')),
    });

    const formik = useFormik({
        initialValues: {
            email: session?.data?.user?.email,
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
            id: session?.data?.user?.id,
        },
        validationSchema,
        onSubmit: async (values, { setErrors }) => {
            try {
                const payload = {
                    id: values.id,
                    email: session?.data?.user?.email,
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword,
                };

                // Call the mutation and handle the response
                const response = await changePassword(payload).unwrap(); // Await the API call and unwrap to handle errors.
                if (response?.error) {
                    showToast(toast, "error", ERROR_MESSAGES.ERROR, response.error)
                    setErrors({
                        currentPassword: ERROR_MESSAGES.INCORRECT_CURRENT,
                        newPassword: ERROR_MESSAGES.MUST_MATCH,
                        confirmPassword: ERROR_MESSAGES.MUST_MATCH,
                    })
                } else {
                    showToast(toast, "success", ERROR_MESSAGES.FORCE_PASSWORD_CHANGE, ERROR_MESSAGES.PASSWORD_CHANGE);
                    signOut({ callbackUrl: "/auth/login" })
                }
            } catch (err: any) {
                showToast(toast, "error", ERROR_MESSAGES.LOGIN_ERROR, err?.data?.message);
                // setErrors({
                //     currentPassword: "Incorrect Current Password",
                // })
            }
        },
    });
    const isFormFieldValid = (formik: any, fieldName: string) =>
        formik.touched[fieldName] && formik.errors[fieldName];

    const passwordPolicies = [
        {
            policy: "8 characters minimum"
        },
        {
            policy: "No Spaces Allowed"
        },
        {
            policy: "One uppercase letter"
        },
        {
            policy: "One lowercase letter"
        },
        {
            policy: "One numeric digit"
        },
        {
            policy: "One special character(!, @, #, $)"
        },
    ]

    return (
        <>
            <Toast ref={toast} />

            <form onSubmit={formik.handleSubmit} className='d-flex flex-column gap-3 auth-form'>
                <div className="flex flex-column gap-2 mt-2" style={{}}>
                    <label htmlFor="currentPassword" className="solid-auth-input-label">Current Password</label>
                    <Password
                        id="currentPassword"
                        name="currentPassword"
                        value={formik.values.currentPassword}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        toggleMask
                        invalid={!!formik.errors.currentPassword}
                        inputClassName="w-full"
                        feedback={false}
                    />
                    {isFormFieldValid(formik, "currentPassword") && <Message
                        className="text-red-500 text-sm"
                        severity="error"
                        text={formik?.errors?.currentPassword?.toString()}
                    />}
                </div>
                <div className="flex flex-column gap-2 mt-1 sm:mt-2 md:mt-3 lg:mt-4" style={{}}>
                    <label htmlFor="password" className="solid-auth-input-label">New Password</label>
                    <Password
                        id="newPassword"
                        name="newPassword"
                        value={formik.values.newPassword}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        toggleMask
                        invalid={!!formik.errors.newPassword}
                        inputClassName="w-full"
                        feedback={false}
                    />
                    {isFormFieldValid(formik, "newPassword") && <Message
                        className="text-red-500 text-sm"
                        severity="error"
                        text={formik?.errors?.newPassword?.toString()}
                    />}
                </div>
                <div className="flex flex-column gap-2 mt-1 sm:mt-2 md:mt-3 lg:mt-4" style={{}}>
                    <label htmlFor="password" className="solid-auth-input-label">Confirm Password</label>
                    <Password
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formik.values.confirmPassword}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        toggleMask
                        invalid={!!formik.errors.confirmPassword}
                        inputClassName="w-full"
                        feedback={false}
                    />
                    {isFormFieldValid(formik, "confirmPassword") && <Message
                        className="text-red-500 text-sm"
                        severity="error"
                        text={formik?.errors?.confirmPassword?.toString()}
                    />}
                </div>
                {/* <div className='mt-4'>
                    <div className='grid'>
                        {passwordPolicies.map((policy, index) => {
                            return (
                                <div key={index} className='col-6'>
                                    <p className="solid-auth-input-label flex align-items-center gap-2">
                                        <div className='flex align-items-center justify-content-center' style={{ height: 14, width: 14, borderRadius: '50%', backgroundColor: '#A4A4A4' }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                <path d="M4.86813 8.72999L2.28979 6.15166L2.91396 5.52749L4.86813 7.48166L9.08563 3.26416L9.7098 3.88833L4.86813 8.72999Z" fill="#E8EAED" />
                                            </svg>
                                        </div>
                                        {policy.policy}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                </div> */}
                {envPasswordHelperText && (
                    <div className="mt-4">
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
                <div className="mt-4">
                    <Button className="w-full font-light auth-submit-button" label="Change Password" disabled={formik.isSubmitting} loading={formik.isSubmitting} />
                </div>
            </form>
        </>
    )
}
export default SolidChangeForcePassword
