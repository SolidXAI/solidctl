
import { getExtensionComponent } from "../../../../helpers/registry";
import { SolidFormFieldWidgetProps } from "../../../../types/solid-core";
import { Message } from "primereact/message";
import { SelectButton } from "primereact/selectbutton";
import { classNames } from "primereact/utils";
import { useEffect, useState } from "react";
import * as Yup from 'yup';
import { FormikObject, ISolidField, SolidFieldProps } from "./ISolidField";
import { Checkbox, CheckboxChangeEvent } from "primereact/checkbox";
import { SolidFieldTooltip } from "../../../../components/common/SolidFieldTooltip";
import { InputSwitch } from "primereact/inputswitch";
import { ERROR_MESSAGES } from "../../../../constants/error-messages";

type BooleanOption = {
    label: string;
    value: string;
};


export class SolidBooleanField implements ISolidField {

    private fieldContext: SolidFieldProps;

    constructor(fieldContext: SolidFieldProps) {
        this.fieldContext = fieldContext;
    }

    updateFormData(value: any, formData: FormData): any {
        const fieldLayoutInfo = this.fieldContext.field;
        formData.append(fieldLayoutInfo.attrs.name, value === "true" || value === true ? "true" : "");
    }

    initialValue(): any {
        const fieldName = this.fieldContext.field.attrs.name;
        const fieldDefaultValue = this.fieldContext?.fieldMetadata?.defaultValue;

        const existingValue = this.fieldContext.data[fieldName];

        // return existingValue !== undefined && existingValue !== null ? existingValue : fieldDefaultValue || '';

        // Ensure the value is always a string "true" or "false"
        // const result = existingValue
        //     ? (existingValue === true || existingValue === "true" ? "true" : "false")
        //     : (fieldDefaultValue === true || fieldDefaultValue === "true" ? "true" : "false");
        // return result;

        if (existingValue !== undefined && existingValue !== null) {
            return existingValue === true || existingValue === "true";
        }
        return fieldDefaultValue === true || fieldDefaultValue === "true";
    }

    validationSchema(): Yup.Schema {
        let schema: Yup.BooleanSchema<boolean | null | undefined> = Yup.boolean();

        const fieldMetadata = this.fieldContext.fieldMetadata;
        const fieldLayoutInfo = this.fieldContext.field;
        const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;

        // 1. required 
        if (fieldMetadata.required) {
            schema = schema.required(ERROR_MESSAGES.FIELD_REUQIRED(fieldLabel));
        } else {
            schema = schema.nullable(); // Allow null when not required
        }
        // // 2. length (min/max)
        // if (fieldMetadata.min && fieldMetadata.min > 0) {
        //     schema = schema.min(fieldMetadata.min, `${fieldLabel} should be at-least ${fieldMetadata.min} characters long.`);
        // }
        // if (fieldMetadata.max && fieldMetadata.max > 0) {
        //     schema = schema.max(fieldMetadata.max, `${fieldLabel} should not be more than ${fieldMetadata.max} characters long.`);
        // }
        // 3. regular expression
        //*********Regex doesnt make sense in boolean right? */
        // if (fieldMetadata.regexPattern) {
        //     const regexPatternNotMatchingErrorMsg = fieldMetadata.regexPatternNotMatchingErrorMsg ?? `${fieldLabel} has invalid data.`
        //     schema = schema.matches(fieldMetadata.regexPattern, regexPatternNotMatchingErrorMsg);
        // }

        return schema;
    }

    render(formik: FormikObject) {

        const fieldMetadata = this.fieldContext.fieldMetadata;
        const fieldLayoutInfo = this.fieldContext.field;
        const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
        const className = fieldLayoutInfo.attrs?.className || 'field col-12';
        useEffect(() => { formik.setFieldValue(fieldLayoutInfo.attrs.name, "false") }, [])

        const isFormFieldValid = (formik: any, fieldName: string) => formik.touched[fieldName] && formik.errors[fieldName];

        let viewWidget = fieldLayoutInfo.attrs.viewWidget;
        let editWidget = fieldLayoutInfo.attrs.editWidget;
        if (!editWidget) {
            editWidget = 'booleanCheckbox';
        }
        if (!viewWidget) {
            viewWidget = 'DefaultBooleanFormViewWidget';
        }
        const viewMode: string = this.fieldContext.viewMode;

        return (
            <>
                <div className={className}>
                    {viewMode === "view" &&
                        this.renderExtensionRenderMode(viewWidget, formik)
                    }
                    {viewMode === "edit" &&
                        (
                            <>
                                {
                                    this.renderExtensionRenderMode(editWidget, formik)
                                }
                            </>
                        )
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



export const DefaultBooleanFormEditWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const className = fieldLayoutInfo.attrs?.className || 'field col-12';
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const solidFormViewMetaData = fieldContext.solidFormViewMetaData;
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;
    const trueLabel = fieldLayoutInfo?.attrs?.trueLabel;
    const falseLabel = fieldLayoutInfo?.attrs?.falseLabel;
    const readOnlyPermission = fieldContext.readOnly;
    // const [booleanOptions, setBooleanOptions] = useState<string[]>(["false", "true"]);
    const [booleanOptions, setBooleanOptions] = useState<BooleanOption[]>([
        { label: "False", value: "false" },
        { label: "True", value: "true" },
    ]);

    // let booleanOptions = ["false", "true"];
    useEffect(() => {
        if (trueLabel || falseLabel) {
            setBooleanOptions([
                {
                    label: falseLabel ?? "False",
                    value: "false",
                },
                {
                    label: trueLabel ?? "True",
                    value: "true",
                },
            ]);
        }
    }, [trueLabel, falseLabel]);

    // useEffect(() => { formik.setFieldValue(fieldLayoutInfo.attrs.name, "false") }, [])
    useEffect(() => {
        const name = fieldLayoutInfo.attrs.name;
        if (formik.values[name] === undefined || formik.values[name] === null) {
            formik.setFieldValue(name, "false");
        }
    }, []);
    const isFormFieldValid = (formik: any, fieldName: string) => formik.touched[fieldName] && formik.errors[fieldName];

    const fieldDisabled = fieldLayoutInfo.attrs?.disabled;
    const fieldReadonly = fieldLayoutInfo.attrs?.readonly;

    const formDisabled = solidFormViewMetaData.data.solidView?.layout?.attrs?.disabled;
    const formReadonly = solidFormViewMetaData.data.solidView?.layout?.attrs?.readonly;

    return (
        <div className="relative">
            <div className="flex flex-column gap-2 mt-1 sm:mt-2 md:mt-3 lg:mt-4">
                {showFieldLabel != false &&
                    <label htmlFor={fieldLayoutInfo.attrs.name} className="form-field-label font-medium">{fieldLabel}
                        {fieldMetadata.required && <span className="text-red-500"> *</span>}
                        <SolidFieldTooltip fieldContext={fieldContext} />
                        {/* &nbsp;   {fieldDescription && <span className="form_field_help">({fieldDescription}) </span>} */}
                    </label>
                }
                {/* <InputText
                    id={fieldLayoutInfo.attrs.name}
                    className="small-input"
                    aria-describedby={`${fieldLayoutInfo.attrs.name}-help`}
                    onChange={formik.handleChange}
                    value={formik.values[fieldLayoutInfo.attrs.name] || ''}
                /> */}
                <SelectButton
                    readOnly={formReadonly || fieldReadonly || readOnlyPermission}
                    disabled={formDisabled || fieldDisabled}
                    optionLabel="label"
                    optionValue="value"
                    id={fieldLayoutInfo.attrs.name}
                    aria-describedby={`${fieldLayoutInfo.attrs.name}-help`}
                    onChange={(e) => { formik.setFieldValue(fieldLayoutInfo.attrs.name, e.value); console.log("value is", e.value) }} // Custom handling for boolean input
                    value={formik.values[fieldLayoutInfo.attrs.name] ? formik.values[fieldLayoutInfo.attrs.name].toString() : "false"}
                    options={booleanOptions}
                    className={classNames("", {
                        "p-invalid": isFormFieldValid(formik, "defaultValue"),
                    })}

                />
            </div>
            {isFormFieldValid(formik, fieldLayoutInfo.attrs.name) && (
                <div className="absolute mt-1">
                    <Message severity="error" text={formik?.errors[fieldLayoutInfo.attrs.name]?.toString()} />
                </div>
            )}
        </div>
    );
}

export const SolidBooleanCheckboxStyleFormEditWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const className = fieldLayoutInfo.attrs?.className || "field col-12";
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const solidFormViewMetaData = fieldContext.solidFormViewMetaData;
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;
    const checkboxLabel = fieldLayoutInfo?.attrs?.checkboxLabel;
    const readOnlyPermission = fieldContext.readOnly;

    // Set default value to false on mount
    useEffect(() => {
        if (formik.values[fieldLayoutInfo.attrs.name] === undefined) {
            console.log("Setting default value:", false);
            formik.setFieldValue(fieldLayoutInfo.attrs.name, false);
        }
    }, []);

    const handleChange = (e: CheckboxChangeEvent) => {
        const newValue = e.checked; // This returns `true` or `false`
        console.log(`${fieldLayoutInfo.attrs.name}, new value:`, newValue);

        formik.setFieldValue(fieldLayoutInfo.attrs.name, newValue === true ? 'true' : 'false');
        formik.setTouched({ ...formik.touched, [fieldLayoutInfo.attrs.name]: true }); // Ensure Formik registers the change
        // ✅ Check if Formik updated the value correctly
        setTimeout(() => {
            console.log("Formik values after update:", formik.values);
        }, 0);
    };

    const isFormFieldValid = (formik: any, fieldName: any) =>
        formik.touched[fieldName] && formik.errors[fieldName];

    const fieldDisabled = fieldLayoutInfo.attrs?.disabled;
    const fieldReadonly = fieldLayoutInfo.attrs?.readonly;
    const formDisabled = solidFormViewMetaData.data.solidView?.layout?.attrs?.disabled;
    const formReadonly = solidFormViewMetaData.data.solidView?.layout?.attrs?.readonly;

    return (
        <div className={className}>
            <div className="relative">
                <div className="flex flex-column gap-2 mt-1 sm:mt-2 md:mt-3 lg:mt-4">
                    {showFieldLabel !== false && (
                        <label htmlFor={fieldLayoutInfo.attrs.name} className="form-field-label font-medium">
                            {fieldLabel}
                            {fieldMetadata.required && <span className="text-red-500"> *</span>}
                            <SolidFieldTooltip fieldContext={fieldContext} />
                        </label>
                    )}

                    <div className="flex align-items-center">
                        <Checkbox
                            id={fieldLayoutInfo.attrs.name}
                            checked={formik.values[fieldLayoutInfo.attrs.name] === true}
                            // onChange={handleChange}
                            onChange={(e) => fieldContext.onChange(e, 'onFieldChange')}
                            disabled={formDisabled || fieldDisabled}
                            readOnly={formReadonly || fieldReadonly || readOnlyPermission}
                            className={classNames("", {
                                "p-invalid": isFormFieldValid(formik, fieldLayoutInfo.attrs.name),
                            })}
                        />
                        {checkboxLabel &&
                            <span className="ml-2">{checkboxLabel || "Yes"}</span>
                        }
                    </div>
                </div>

                {isFormFieldValid(formik, fieldLayoutInfo.attrs.name) && (
                    <div className="absolute mt-1">
                        <Message severity="error" text={formik.errors[fieldLayoutInfo.attrs.name]?.toString()} />
                    </div>
                )}
            </div>
        </div>
    );
}

export const SolidBooleanSwitchStyleFormEditWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const className = fieldLayoutInfo.attrs?.className || "field col-12";
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const solidFormViewMetaData = fieldContext.solidFormViewMetaData;
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;
    const readOnlyPermission = fieldContext.readOnly;

    // Set default value to false on mount
    useEffect(() => {
        if (formik.values[fieldLayoutInfo.attrs.name] === undefined) {
            console.log("Setting default value:", false);
            formik.setFieldValue(fieldLayoutInfo.attrs.name, false);
        }
    }, []);

    const handleChange = (e: any) => {
        const newValue = e.value;
        console.log(`${fieldLayoutInfo.attrs.name} switch clicked, new value:`, newValue);

        // formik.setFieldValue(fieldLayoutInfo.attrs.name, newValue === true ? true : false);
        // formik.setTouched({ ...formik.touched, [fieldLayoutInfo.attrs.name]: true }); // Ensure Formik registers the change
        // // ✅ Check if Formik updated the value correctly
        // setTimeout(() => {
        //     console.log("Formik values after update:", formik.values);
        // }, 0);

        // 1: BYPASS Formik's validation by directly mutating the values object
        // This is necessary because the validation schema was rejecting boolean values
        // Direct assignment skips all validation logic that was causing the issue
        formik.values[fieldLayoutInfo.attrs.name] = newValue;

        // 2: Force Formik to recognize the change and trigger re-renders
        // setValues() with the second parameter as 'false' means:
        // - false = skip validation (avoid the schema conflict)
        // - This triggers Formik's internal change detection and component re-renders
        formik.setValues({ ...formik.values }, false);

        // 3: Mark the field as "touched" to indicate user interaction
        // This is important for validation state and form submission logic
        // The 'false' parameter means don't validate immediately
        formik.setTouched({ ...formik.touched, [fieldLayoutInfo.attrs.name]: true }, false);
        fieldContext.onChange(e, 'onFieldChange');
    };

    const isFormFieldValid = (formik: any, fieldName: any) =>
        formik.touched[fieldName] && formik.errors[fieldName];

    const fieldDisabled = fieldLayoutInfo.attrs?.disabled;
    const fieldReadonly = fieldLayoutInfo.attrs?.readonly;
    const formDisabled = solidFormViewMetaData.data.solidView?.layout?.attrs?.disabled;
    const formReadonly = solidFormViewMetaData.data.solidView?.layout?.attrs?.readonly;

    return (
        <div className={className}>
            <div className="relative">
                <div className="flex flex-column gap-2 mt-1 sm:mt-2 md:mt-3 lg:mt-4">
                    {showFieldLabel !== false && (
                        <label htmlFor={fieldLayoutInfo.attrs.name} className="form-field-label font-medium">
                            {fieldLabel}
                            {fieldMetadata.required && <span className="text-red-500"> *</span>}
                            <SolidFieldTooltip fieldContext={fieldContext} />
                        </label>
                    )}

                    <div className="flex align-items-center">
                        <InputSwitch
                            id={fieldLayoutInfo.attrs.name}
                            name={fieldLayoutInfo.attrs.name}
                            checked={formik.values[fieldLayoutInfo.attrs.name] === true || formik.values[fieldLayoutInfo.attrs.name] === "true"}
                            onChange={handleChange}
                            // onChange={(e) => {fieldContext.onChange(e, 'onFieldChange')}
                            disabled={formDisabled || fieldDisabled}
                            readOnly={formReadonly || fieldReadonly || readOnlyPermission}
                            className={classNames("", {
                                "p-invalid": isFormFieldValid(formik, fieldLayoutInfo.attrs.name),
                            })}
                        />
                        <span className="ml-2">{fieldLabel || "Yes"}</span>
                    </div>
                </div>

                {isFormFieldValid(formik, fieldLayoutInfo.attrs.name) && (
                    <div className="absolute mt-1">
                        <Message severity="error" text={formik.errors[fieldLayoutInfo.attrs.name]?.toString()} />
                    </div>
                )}
            </div>
        </div>
    );
}

export const DefaultBooleanFormViewWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {

    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;

    // const trueLabel = fieldLayoutInfo?.attrs?.trueLabel;
    // const falseLabel = fieldLayoutInfo?.attrs?.falseLabel;

    const [trueLabel, setTrueLabel] = useState<string>("true");
    const [falseLabel, setFalseLabel] = useState<string>("false");

    useEffect(() => {
        if (fieldLayoutInfo?.attrs?.trueLabel) {
            setTrueLabel(fieldLayoutInfo?.attrs?.trueLabel)
        }
        if (fieldLayoutInfo?.attrs?.falseLabel) {
            setFalseLabel(fieldLayoutInfo?.attrs?.falseLabel)
        }
    }, [fieldLayoutInfo?.attrs?.falseLabel, fieldLayoutInfo?.attrs?.trueLabel])


    return (
        <div className="mt-2 flex-column gap-2">
            {showFieldLabel !== false && (
                <p className="m-0 form-field-label font-medium">{fieldLabel}</p>
            )}
            <p className="m-0">{formik.values[fieldLayoutInfo.attrs.name] === true || formik.values[fieldLayoutInfo.attrs.name] === "true" ? trueLabel : falseLabel}</p>
        </div>
    );
}
