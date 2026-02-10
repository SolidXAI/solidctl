import { handleLogout } from "../../../../adapters/auth/handleLogout";
import { useChangePasswordMutation } from '../../../../redux/api/authApi';
import { useFormik } from 'formik';
import { useSession } from "../../../../hooks/useSession";
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Password } from 'primereact/password';
import { Toast } from 'primereact/toast';
import { useMemo, useRef } from 'react';
import * as Yup from 'yup';
import { SolidPasswordHelperText } from '../SolidPasswordHelperText';
import { ERROR_MESSAGES } from '../../../../constants/error-messages';
import { env } from "../../../../adapters/env";
import showToast from "../../../../helpers/showToast";

export const SolidChangePassword = ({ solidSettingsData }: any) => {
    const toast = useRef<Toast>(null);
    const [changePassword] = useChangePasswordMutation();

    const session: any = useSession();

    const envPasswordRegex = env("NEXT_PUBLIC_PASSWORD_REGEX");

    // Try backend regex first, then env, then fallback
    const effectiveRegex = useMemo(() => {
        try {
            const backendRegex = solidSettingsData?.data?.authenticationPasswordRegex;
            if (backendRegex) {
                // const unescaped = JSON.parse(`"${backendRegex}"`);
                return new RegExp(backendRegex);
            }
            if (envPasswordRegex) {
                const unescaped = JSON.parse(`"${envPasswordRegex}"`);
                return new RegExp(unescaped);
            }
        } catch (error) {
            console.error(ERROR_MESSAGES.INVALID_PASSWORD_REGX, error);
        }
        return null;
    }, [solidSettingsData, envPasswordRegex]);

    const validationSchema = useMemo(() => {
        const newPasswordValidation = effectiveRegex
            ? Yup.string()
                .matches(
                    effectiveRegex,
                    solidSettingsData?.data?.authenticationPasswordRegexErrorMessage ||
                    ERROR_MESSAGES.PASSWORD_DO_NOT_MEET
                )
                .required(ERROR_MESSAGES.FIELD_REUQIRED('New password'))
            : Yup.string()
                .min(6, ERROR_MESSAGES.PASSWORD_CHARACTER(6))
                .required(ERROR_MESSAGES.FIELD_REUQIRED('New password'));

        return Yup.object({
            email: Yup.string().email(ERROR_MESSAGES.FIELD_INAVLID_FORMAT('email')).required(ERROR_MESSAGES.FIELD_REUQIRED('Email')),
            currentPassword: Yup.string()
                .min(6, ERROR_MESSAGES.PASSWORD_CHARACTER(6))
                .required(ERROR_MESSAGES.FIELD_REUQIRED('Current password')),
            newPassword: newPasswordValidation,
            confirmPassword: Yup.string()
                .oneOf([Yup.ref("newPassword")], ERROR_MESSAGES.MUST_MATCH)
                .required(ERROR_MESSAGES.FIELD_REUQIRED('Confirm password')),
            id: Yup.number().required(ERROR_MESSAGES.FIELD_INAVLID_FORMAT('User ID')),
        });
    }, [effectiveRegex, solidSettingsData]);

    const formik = useFormik({
        initialValues: {
            email: session?.data?.user?.email,
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
            id: session?.data?.user?.id,
        },
        validationSchema,
        onSubmit: async (values, { setErrors, resetForm }) => {
            try {
                const payload = {
                    id: values.id,
                    email: session?.data?.user?.email,
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword,
                };

                const response = await changePassword(payload).unwrap();
                if (response?.error) {
                    showToast(toast, "error", ERROR_MESSAGES.ERROR, response.error)
                    setErrors({
                        currentPassword: ERROR_MESSAGES.INCORRECT_CURRENT,
                        newPassword: ERROR_MESSAGES.MUST_MATCH,
                        confirmPassword: ERROR_MESSAGES.MUST_MATCH,
                    })
                } else {
                    showToast(toast, "success", ERROR_MESSAGES.PASSWORD_CHANGE, ERROR_MESSAGES.PASSWORD_CHANGE);
                    handleLogout(toast)
                    resetForm();
                }
            } catch (err: any) {
                showToast(toast, "error", err?.data?.message, err?.data?.data?.message ? err?.data?.data?.message : err?.data?.message);
            }
        },
    });
    const isFormFieldValid = (formik: any, fieldName: string) =>
        formik.touched[fieldName] && formik.errors[fieldName];

    return (
        <form onSubmit={formik.handleSubmit} className="h-full flex flex-column justify-content-between">
            <Toast ref={toast} />
            <div>
                <div className='grid'>
                    <div className='col-12 md-col-8 lg:col-5'>
                        <div className="flex flex-column gap-2">
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
                        <div className="flex flex-column gap-2 mt-1 sm:mt-2 md:mt-3 lg:mt-4">
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
                        <div className="flex flex-column gap-2 mt-1 sm:mt-2 md:mt-3 lg:mt-4">
                            <label htmlFor="password" className="solid-auth-input-label">Confirm New Password</label>
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
                    </div>
                </div>
                <SolidPasswordHelperText text={solidSettingsData?.data?.authenticationPasswordComplexityDescription} />
            </div>
            <div>
                <Button type='submit' size='small' label="Change Password" disabled={formik.isSubmitting} loading={formik.isSubmitting} />
            </div>
        </form>
    )
}
