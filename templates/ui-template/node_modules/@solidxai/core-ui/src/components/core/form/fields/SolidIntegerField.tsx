
import { InputNumber } from "primereact/inputnumber";
import { Message } from "primereact/message";
import * as Yup from 'yup';
import { FormikObject, ISolidField, SolidFieldProps } from "./ISolidField";
import { getExtensionComponent } from "../../../../helpers/registry";
import { SolidFormFieldWidgetProps } from "../../../../types/solid-core";
import { Slider } from "primereact/slider";
import styles from './solidFields.module.css'
import { useState } from "react";
import { SolidFieldTooltip } from "../../../../components/common/SolidFieldTooltip";
import { Range } from "react-range";
import { ERROR_MESSAGES } from "../../../../constants/error-messages";

export class SolidIntegerField implements ISolidField {

    private fieldContext: SolidFieldProps;

    constructor(fieldContext: SolidFieldProps) {
        this.fieldContext = fieldContext;
    }

    updateFormData(value: any, formData: FormData): any {
        const fieldLayoutInfo = this.fieldContext.field;
        if (value !== undefined && value !== null) {
            formData.append(fieldLayoutInfo.attrs.name, value);
        }
    }

    initialValue(): any {
        const fieldName = this.fieldContext.field.attrs.name;
        const fieldDefaultValue = this.fieldContext?.fieldMetadata?.defaultValue;
        if (this.fieldContext.parentData && this.fieldContext.parentData[fieldName]) {
            const parentDataForKey = this.fieldContext.parentData[fieldName];
            if (parentDataForKey && typeof parentDataForKey !== 'object') {
                return this.fieldContext.parentData[fieldName]
            }
        }

        const existingValue = this.fieldContext.data[fieldName];

        return existingValue !== undefined && existingValue !== null ? existingValue : fieldDefaultValue || '';
    }

    validationSchema(): Yup.Schema {
        let schema: Yup.NumberSchema<number | null | undefined> = Yup.number();


        const fieldMetadata = this.fieldContext.fieldMetadata;
        const fieldLayoutInfo = this.fieldContext.field;
        const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;

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
            schema = schema.max(fieldMetadata.max, ERROR_MESSAGES.FIELD_MAXIMUM_CHARACTER(fieldLabel,fieldMetadata.max));
        }
        return schema;
    }

    render(formik: FormikObject) {
        const fieldLayoutInfo = this.fieldContext.field;
        const isFormFieldValid = (formik: any, fieldName: string) => formik.touched[fieldName] && formik.errors[fieldName];
        const className = fieldLayoutInfo.attrs?.className || 'field col-12';

        let viewWidget = fieldLayoutInfo.attrs.viewWidget;
        let editWidget = fieldLayoutInfo.attrs.editWidget;
        if (!editWidget) {
            editWidget = 'DefaultIntegerFormEditWidget';
        }
        if (!viewWidget) {
            viewWidget = 'DefaultIntegerFormViewWidget';
        }
        const viewMode: string = this.fieldContext.viewMode;
        return (
            <>
                <div className={className}>
                    {viewMode === "view" &&
                        this.renderExtensionRenderMode(viewWidget, formik)
                    }
                    {viewMode === "edit" && (
                        <>
                            {editWidget &&
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


export const DefaultIntegerFormViewWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {

    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;
    return (
        <div className="mt-2 flex-column gap-2">
            {showFieldLabel !== false && (
                <p className="m-0 form-field-label font-medium">{fieldLabel}</p>
            )}
            <p className="m-0">{formik.values[fieldLayoutInfo.attrs.name] && typeof formik.values[fieldLayoutInfo.attrs.name] !== "object" && formik.values[fieldLayoutInfo.attrs.name]}</p>
        </div>
    );
}



export const DefaultIntegerFormEditWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {

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
        <div className="relative">
            <div className="flex flex-column gap-2 mt-1 sm:mt-2 md:mt-3 lg:mt-4">
                {showFieldLabel != false &&
                    <label htmlFor={fieldLayoutInfo.attrs.name} className="form-field-label">{fieldLabel}
                        {fieldMetadata.required && <span className="text-red-500"> *</span>}
                        <SolidFieldTooltip fieldContext={fieldContext} />
                        {/* &nbsp;   {fieldDescription && <span className="form_field_help">({fieldDescription}) </span>} */}
                    </label>
                }
                <InputNumber
                    readOnly={formReadonly || fieldReadonly || readOnlyPermission}
                    disabled={formDisabled || fieldDisabled}
                    id={fieldLayoutInfo.attrs.name}
                    aria-describedby={`${fieldLayoutInfo.attrs.name}-help`}
                    onChange={(e: any) => {
                        formik.setFieldValue(fieldLayoutInfo.attrs.name, e.value)
                    }}
                    value={formik.values[fieldLayoutInfo.attrs.name] || ''}
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

export const SolidIntegerSliderStyleFormEditWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;
    const readOnlyPermission = fieldContext.readOnly;
    const fieldDisabled = fieldLayoutInfo.attrs?.disabled;
    const fieldReadonly = fieldLayoutInfo.attrs?.readonly;
    const solidFormViewMetaData = fieldContext.solidFormViewMetaData;
    const formDisabled = solidFormViewMetaData.data.solidView?.layout?.attrs?.disabled;
    const formReadonly = solidFormViewMetaData.data.solidView?.layout?.attrs?.readonly;
    const min = fieldMetadata.min || 0;
    const max = fieldMetadata.max || 5;
    const isFormFieldValid = (formik: any, fieldName: string) => formik.touched[fieldName] && formik.errors[fieldName];
    const fieldName = fieldLayoutInfo.attrs.name;
    const currentValue = Number(formik.values[fieldName] ?? min);

    return (
        <div className="w-full" style={{ height: '60px' }}>
            {showFieldLabel != false && (
                <div className="font-medium mb-2">{fieldLabel}
                    {fieldMetadata.required && <span className="text-red-500"> *</span>}
                </div>
            )}
            <div className="relative h-12">
                <Range
                    step={1}
                    min={min}
                    max={max}
                    values={[currentValue]}
                    onChange={(values) => {
                        formik.setFieldValue(fieldName, values[0]);
                    }}
                    renderTrack={({ props, children }) => {
                        const percent = ((currentValue - min) / (max - min)) * 100;
                        return (
                            <div
                                {...props}
                                style={{
                                    ...props.style,
                                    height: "10px",
                                    width: "100%",
                                    borderRadius: "8px",
                                    backgroundColor: "var(--primary-light-color)",
                                    position: "relative",
                                }}
                            >
                                <div
                                    style={{
                                        position: "absolute",
                                        height: "100%",
                                        width: `${percent}%`,
                                        backgroundColor: "var(--primary-color)",
                                        borderRadius: "5px",
                                        top: 0,
                                        left: 0,
                                    }}
                                />
                                {children}
                            </div>
                        )
                    }}
                    renderThumb={({ props }) => (
                        <div
                            {...props}
                            key={props.key}
                            style={{
                                ...props.style,
                                height: "18px",
                                width: "18px",
                                border: "4px solid var(--surface-0)",
                                borderRadius: '50%',
                                backgroundColor: "var(--primary-color)",
                            }}
                        />
                    )}
                />
                <div className="flex align-item-center justify-content-between mt-2">
                    {Array.from({ length: max - min + 1 }, (_, i) => {
                        const num = i + min;
                        return (
                            <span
                                key={num}
                                className="text-sm"
                            >
                                {num === 0 ? '' : num}
                            </span>
                        );
                    })}
                </div>
                {isFormFieldValid(formik, fieldLayoutInfo.attrs.name) && (
                    <div className="absolute mt-2">
                        <Message severity="error" text={formik?.errors[fieldLayoutInfo.attrs.name]?.toString()} />
                    </div>
                )}
            </div>
        </div>
    );
};