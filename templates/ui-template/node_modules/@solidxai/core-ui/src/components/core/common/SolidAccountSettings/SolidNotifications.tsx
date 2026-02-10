
import { ERROR_MESSAGES } from '../../../../constants/error-messages';
import { useBulkUpdateSolidUserSettingsMutation, useGetSolidSettingsQuery } from '../../../../redux/api/solidSettingsApi';
import { useFormik } from 'formik';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { Toast } from 'primereact/toast';
import React, { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux';
import showToast from "../../../../helpers/showToast";
export const SolidNotifications = () => {
    const {
        data: solidSettingsData,
        isLoading,
        error,
        refetch,
    } = useGetSolidSettingsQuery(undefined);

    useEffect(() => {
        refetch();
    }, []);

    const toast = useRef<Toast>(null);
    const [bulkUpdateSolidSettings] = useBulkUpdateSolidUserSettingsMutation();

    const initialValues = {
        enableNotification: solidSettingsData?.data?.enableNotification ?? true
    }

    const formik = useFormik({
        initialValues: initialValues,
        enableReinitialize: true,
        onSubmit: async (values) => {
            try {
                const updatedSettingsArray: Array<{ key: string; value: string; type: string }> = [];
                const currentSettings = solidSettingsData?.data?.user || {};

                const formData = new FormData();

                // Compare changed fields
                Object.entries(values).forEach(([key, value]) => {
                    const currentValue = currentSettings[key];

                    const normalizedCurrent = currentValue ?? "";
                    const normalizedValue = value ?? "";

                    if (normalizedCurrent !== normalizedValue) {
                        if (value instanceof File) {
                            formData.append(key, value);
                            updatedSettingsArray.push({
                                key,
                                value: "",
                                type: "user",
                            });
                        } else {
                            updatedSettingsArray.push({
                                key,
                                value: value,
                                type: "user",
                            });
                        }
                    }
                });

                if (updatedSettingsArray.length === 0) {
                    showToast(toast, "success", ERROR_MESSAGES.NO_CHANGE, ERROR_MESSAGES.NO_SETTING_UPDATE);
                    return;
                }

                // Append settings array to formData
                formData.append("settings", JSON.stringify(updatedSettingsArray));

                // Call API
                const response = await bulkUpdateSolidSettings({ data: formData }).unwrap();

                if (response.statusCode === 200) {
                    showToast(toast, "success", ERROR_MESSAGES.UPDATED, ERROR_MESSAGES.SETTING_UPDATED);
                }

            } catch (error) {
                showToast(toast, "error", ERROR_MESSAGES.FAILED, ERROR_MESSAGES.SOMETHING_WRONG);
            }
        },
    })


    return (
        <form onSubmit={formik.handleSubmit} className="h-full flex flex-column justify-content-between">
            <Toast ref={toast} />
            <div>
                <div className="flex align-items-start justify-content-between pb-3">
                    <div>
                        <label className="form-field-label mb-2">Enable Notification</label>
                        <div style={{ color: 'var(--solid-grey-500)' }}>Decide whether you want to be notified of new messages or updates.</div>
                    </div>
                    <div>
                        <InputSwitch
                            name="enableNotification"
                            checked={formik.values.enableNotification}
                            onChange={(e) => {
                                formik.setFieldValue("enableNotification", e.value);
                                // formik.submitForm();
                            }}
                        />
                    </div>
                </div>
                {/* <div className="flex align-items-start justify-content-between pb-3 mt-3" style={{ borderBottom: '1px dashed var(--primary-light-color)' }}>
                <div>
                    <label className="form-field-label mb-2">Enable Notification</label>
                    <div style={{ color: 'var(--solid-grey-500)' }}>Decide whether you want to be notified of new messages or updates.</div>
                </div>
                <div>
                    <InputSwitch
                        name="enableNotification"
                        checked={formik.values.enableNotification}
                        onChange={(e) => {
                            formik.setFieldValue("enableNotification", e.value);
                            formik.submitForm();
                        }}
                    />
                </div>
            </div> */}
            </div>
            <div>
                <Button type='submit' size='small' label="Save" disabled={formik.isSubmitting} loading={formik.isSubmitting} />
            </div>
        </form>
    )
}