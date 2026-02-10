
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import * as Yup from 'yup';
import { FormikObject, ISolidField, SolidFieldProps } from "./ISolidField";
import { Password } from "primereact/password";
import { getExtensionComponent } from "../../../../helpers/registry";
import { SolidFormFieldWidgetProps } from "../../../../types/solid-core";
import { useState } from "react";
import { SolidFieldTooltip } from "../../../../components/common/SolidFieldTooltip";
import { Formik, useFormik } from "formik";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { usePathname } from "../../../../hooks/usePathname";
import { useSearchParams } from "../../../../hooks/useSearchParams";
import { updatePasswordField } from "../../../../helpers/updatePasswordField";
import { ERROR_MESSAGES } from "../../../../constants/error-messages";

export class SolidPasswordField implements ISolidField {

    private fieldContext: SolidFieldProps;

    constructor(fieldContext: SolidFieldProps) {
        this.fieldContext = fieldContext;
    }

    updateFormData(value: any, formData: FormData): void {
        const fieldName = this.fieldContext?.field?.attrs?.name;
        if (value !== undefined && value !== null && value !== '') {
            formData.append(fieldName, value);
        }
    }


    initialValue(): any {
        const fieldName = this.fieldContext.field.attrs.name;
        const fieldDefaultValue = this.fieldContext?.fieldMetadata?.defaultValue;

        const existingValue = this.fieldContext.data[fieldName];
        // return existingValue !== undefined && existingValue !== null ? existingValue : fieldDefaultValue || '';
        return existingValue !== undefined && existingValue !== null ? undefined : fieldDefaultValue || '';
    }

    validationSchema(): Yup.Schema {
        let schema: Yup.StringSchema<string | null | undefined> = Yup.string();

        const fieldMetadata = this.fieldContext.fieldMetadata;
        const fieldLayoutInfo = this.fieldContext.field;
        const fieldName = fieldLayoutInfo.attrs.name;
        const confirmFieldName = `${fieldName}Confirm`;
        const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;

        // 1. required 
        // 1. required
        if (fieldMetadata.required) {
            schema = schema.required(ERROR_MESSAGES.FIELD_REUQIRED(fieldLabel));
        } else {
            schema = schema.nullable(); // Allow null when not required
        }

        // 2. length (min/max)
        if (fieldMetadata.min && fieldMetadata.min > 0) {
            schema = schema.min(fieldMetadata.min, ERROR_MESSAGES.FIELD_MINIMUM_CHARACTER(fieldLabel, fieldMetadata.min));
        }
        if (fieldMetadata.max && fieldMetadata.max > 0) {
            schema = schema.max(fieldMetadata.max, ERROR_MESSAGES.FIELD_MAXIMUM_CHARACTER(fieldLabel, fieldMetadata.max));
        }
        // 3. regular expression
        if (fieldMetadata.regexPattern) {
            const regexPatternNotMatchingErrorMsg = fieldMetadata.regexPatternNotMatchingErrorMsg ?? ERROR_MESSAGES.FIELD_INVALID_DATA(fieldLabel)
            schema = schema.matches(fieldMetadata.regexPattern, regexPatternNotMatchingErrorMsg);
        }
        //check password and confirm password match if password have value
        schema = schema.test('passwords-match', ERROR_MESSAGES.FIELD_MUST_MATCH(fieldLabel), function (value) {
            const { path, parent } = this;
            const confirmValue = parent[confirmFieldName];

            //  Edit mode / untouched → SKIP
            if (!value && !confirmValue) {
                return true;
            }
            //  Only one filled → ERROR
            if (value || confirmValue) {
                return value === confirmValue;
            }
            return true; // If password is empty, don't validate match
        });
        return schema;
    }

    render(formik: FormikObject) {
        const fieldMetadata = this.fieldContext.fieldMetadata;
        const fieldLayoutInfo = this.fieldContext.field;
        const isFormFieldValid = (formik: any, fieldName: string) => formik.touched[fieldName] && formik.errors[fieldName];
        const className = fieldLayoutInfo.attrs?.className || 'field col-12';
        let viewWidget = fieldLayoutInfo.attrs.viewWidget;
        let editWidget = fieldLayoutInfo.attrs.editWidget;
        let createWidget = fieldLayoutInfo?.attrs?.createWidget;
        const pathname = usePathname();
        const isCreateForm = pathname.endsWith('/new');
        const data = this.fieldContext.data || {};
        const isFieldDataEmpty = Object.keys(data).length === 0;
        if (!createWidget) {
            createWidget = 'DefaultPasswordFormCreateWidget';
        }
        if (!editWidget) {
            editWidget = 'DefaultPasswordFormEditWidget';
        }
        if (!viewWidget) {
            viewWidget = 'DefaultPasswordFormViewWidget';  // add of this need to createWidget
        }
        const viewMode: string = this.fieldContext.viewMode;

        return (
            <>
                <div className={className}>
                    {viewMode === "view" &&
                        <></>
                        // this.renderExtensionRenderMode(viewWidget, formik)
                    }
                    {viewMode === "edit" && (!isCreateForm && !isFieldDataEmpty) &&
                        <>
                            {editWidget &&
                                this.renderExtensionRenderMode(editWidget, formik)
                            }
                        </>
                    }
                    {viewMode === "edit" && (isCreateForm || isFieldDataEmpty) &&
                        <>
                            {createWidget &&
                                this.renderExtensionRenderMode(createWidget, formik)
                            }
                        </>
                    }

                </div>
            </>
        );
    }

    renderExtensionRenderMode(widget: string, formik: FormikObject) {
        let DynamicWidget = getExtensionComponent(widget);
        const widgetProps: SolidFormFieldWidgetProps = {
            formik: formik,
            fieldContext: this.fieldContext,
        }
        return (
            <>
                {DynamicWidget && <DynamicWidget {...widgetProps} />}
            </>
        )
    }
}

export const DefaultPasswordFormViewWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;
    const [isText, setIsText] = useState(false)
    return (
        <div className="mt-2 flex-column gap-2">
            {showFieldLabel !== false && (
                <p className="m-0 form-field-label font-medium">{fieldLabel}</p>
            )}
            <div className="flex align-items-center gap-4">
                <p className="m-0">
                    {isText ? formik.values[fieldLayoutInfo.attrs.name] : "••••••••"}
                </p>
                <i
                    className={`pi ${isText ? 'pi-eye' : 'pi-eye-slash'}`}
                    onClick={() => setIsText(!isText)}
                    style={{ cursor: 'pointer' }}
                />
            </div>

        </div>
    );
}



//  Adding formCreateWidget
export const DefaultPasswordFormCreateWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const className = fieldLayoutInfo.attrs?.className || 'field col-12';
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const fieldDescription = fieldLayoutInfo.attrs.description ?? fieldMetadata.description;
    const solidFormViewMetaData = fieldContext.solidFormViewMetaData;
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;
    const readOnlyPermission = fieldContext.readOnly;

    const isFormFieldValid = (formik: any, fieldName: string) => formik.touched[fieldName] && formik.errors[fieldName];

    const fieldDisabled = fieldLayoutInfo.attrs?.disabled;
    const fieldReadonly = fieldLayoutInfo.attrs?.readonly;

    const formDisabled = solidFormViewMetaData.data.solidView?.layout?.attrs?.disabled;
    const formReadonly = solidFormViewMetaData.data.solidView?.layout?.attrs?.readonly;
    return (
        <div className="relative ">
            <div className="password-field-component">
                <div className="flex flex-column gap-2 mt-1 sm:mt-2 md:mt-3 lg:mt-4">
                    {showFieldLabel != false &&
                        <label htmlFor={fieldLayoutInfo.attrs.name} className="form-field-label">
                            {fieldLabel}
                            {fieldMetadata.required && <span className="text-red-500"> *</span>}
                            <SolidFieldTooltip fieldContext={fieldContext} />
                        </label>
                    }
                    <Password
                        id={fieldLayoutInfo.attrs.name}
                        name={fieldMetadata.name}
                        value={formik.values[fieldLayoutInfo.attrs.name] || ''}
                        onChange={(e) => fieldContext.onChange(e, 'onFieldChange')}
                        onBlur={(e) => fieldContext.onBlur(e, 'onFieldBlur')}
                        readOnly={formReadonly || fieldReadonly || readOnlyPermission}
                        disabled={formDisabled || fieldDisabled}
                        toggleMask
                        autoComplete="new-password"
                    />
                </div>
                {isFormFieldValid(formik, fieldLayoutInfo.attrs.name) && (
                    <Message severity="error" text={formik?.errors[fieldLayoutInfo.attrs.name]?.toString()} />
                )}

                <div className="flex flex-column gap-2 mt-1 sm:mt-2 md:mt-3 lg:mt-4">
                    <label htmlFor={`${fieldLayoutInfo.attrs.name}Confirm`} className="form-field-label">
                        Confirm {fieldLabel}
                        {fieldMetadata.required && <span className="text-red-500"> *</span>}
                    </label>
                    <Password
                        id={`${fieldLayoutInfo.attrs.name}Confirm`}
                        name={`${fieldLayoutInfo.attrs.name}Confirm`}
                        value={formik.values[`${fieldLayoutInfo.attrs.name}Confirm`] || ''}
                        onChange={(e) => {
                            formik.setFieldValue(`${fieldLayoutInfo.attrs.name}Confirm`, e.target.value);
                        }}
                        onBlur={(e) => {
                            formik.setFieldTouched(`${fieldLayoutInfo.attrs.name}Confirm`, true);
                        }}
                        readOnly={formReadonly || fieldReadonly || readOnlyPermission}
                        disabled={formDisabled || fieldDisabled}
                        toggleMask
                        autoComplete="new-password"
                    />
                    {isFormFieldValid(formik, `${fieldLayoutInfo.attrs.name}Confirm`) && (
                        <Message severity="error" text={formik?.errors[`${fieldLayoutInfo.attrs.name}Confirm`]?.toString()} />
                    )}
                </div>
            </div>
        </div>
    );
}


// Adding formEditWidget custom

export const DefaultPasswordFormEditWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;

    const className = fieldLayoutInfo.attrs?.className || 'field col-12';
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const fieldDescription = fieldLayoutInfo.attrs.description ?? fieldMetadata.description;
    const solidFormViewMetaData = fieldContext.solidFormViewMetaData;
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;
    const readOnlyPermission = fieldContext.readOnly;

    const fieldDisabled = fieldLayoutInfo.attrs?.disabled;
    const fieldReadonly = fieldLayoutInfo.attrs?.readonly;
    const formDisabled = solidFormViewMetaData.data.solidView?.layout?.attrs?.disabled;
    const formReadonly = solidFormViewMetaData.data.solidView?.layout?.attrs?.readonly;
    const url = fieldContext?.modelName
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
        .toLowerCase();
    const id = fieldContext?.data?.id;

    const isFormFieldValid = (formik: any, fieldName: string) =>
        formik.touched[fieldName] && formik.errors[fieldName];

    const [visible, setVisible] = useState(false);

    const fieldName = fieldLayoutInfo.attrs.name;
    const confirmFieldName = `${fieldName}Confirm`;

    const modalFormik = useFormik({
        initialValues: {
            [fieldName]: '',
            [confirmFieldName]: '',
        },
        validationSchema: Yup.object({
            [fieldName]: Yup.string().required(ERROR_MESSAGES.FIELD_REUQIRED(fieldLabel)),
            [confirmFieldName]: Yup.string()
                .required(`Confirm ${ERROR_MESSAGES.FIELD_REUQIRED(fieldLabel)}`)
                .oneOf([Yup.ref(fieldName)], ERROR_MESSAGES.FIELD_MUST_MATCH(fieldLabel)),
        }),
        onSubmit: async (values: { [x: string]: any; }, { resetForm }: any) => {
            try {
                await updatePasswordField({
                    url,
                    id,
                    fieldName,
                    fieldValue: values[fieldName],
                    confirmFieldName,
                    confirmFieldValue: values[confirmFieldName],
                });

                // formik.setFieldValue(fieldName, values[fieldName]);
                resetForm();
                setVisible(false);
            } catch (err) {
                console.error(err);
                // TODO: show user-friendly error
            }
        },
    });

    return (
        <div className={className}>
            {showFieldLabel !== false && (
                <label htmlFor={fieldName} className="form-field-label">
                    {fieldLabel}
                    {fieldMetadata.required && <span className="text-red-500"> *</span>}
                    <SolidFieldTooltip fieldContext={fieldContext} />
                </label>
            )}

            <Button
                type="button"
                label="Change Password"
                icon="pi pi-lock"
                onClick={() => setVisible(true)}
                className="mt-2"
                disabled={formDisabled || fieldDisabled || readOnlyPermission || fieldReadonly}
            />

            <Dialog
                header={`Change ${fieldLabel}`}
                visible={visible}
                onHide={() => setVisible(false)}
                style={{ width: '30vw' }}
                className="solid-confirm-dialog"
            >
                <form onSubmit={modalFormik.handleSubmit} className="p-fluid">
                    <div className="field">
                        <label htmlFor={fieldName}>New {fieldLabel}</label>
                        <Password
                            id={fieldName}
                            name={fieldName}
                            value={modalFormik.values[fieldName]}
                            onChange={modalFormik.handleChange}
                            onBlur={modalFormik.handleBlur}
                            toggleMask
                            feedback={false}
                            autoComplete="new-password"
                        />
                        {isFormFieldValid(modalFormik, fieldName) && (
                            <Message severity="error" text={modalFormik.errors[fieldName]?.toString()} />
                        )}
                    </div>

                    <div className="field mt-4">
                        <label htmlFor={confirmFieldName}>Confirm {fieldLabel}</label>
                        <Password
                            id={confirmFieldName}
                            name={confirmFieldName}
                            value={modalFormik.values[confirmFieldName]}
                            onChange={modalFormik.handleChange}
                            onBlur={modalFormik.handleBlur}
                            toggleMask
                            feedback={false}
                            autoComplete="new-password"
                        />
                        {isFormFieldValid(modalFormik, confirmFieldName) && (
                            <Message severity="error" text={modalFormik.errors[confirmFieldName]?.toString()} />
                        )}
                    </div>

                    <div className="mt-5">
                        <Button label="Update Password" icon="pi pi-check" type="submit" className="w-full" />
                    </div>
                </form>
            </Dialog>
        </div>
    );
};


