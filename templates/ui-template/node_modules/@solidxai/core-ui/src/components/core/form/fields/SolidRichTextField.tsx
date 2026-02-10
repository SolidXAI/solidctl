
import { Editor } from "primereact/editor";
import { Message } from "primereact/message";
import { useState } from "react";
import * as Yup from 'yup';
import { FormikObject, ISolidField, SolidFieldProps } from "./ISolidField";
import { getExtensionComponent } from "../../../../helpers/registry";
import { SolidFormFieldWidgetProps } from "../../../../types/solid-core";
import { SolidFieldTooltip } from "../../../../components/common/SolidFieldTooltip";
import { ERROR_MESSAGES } from "../../../../constants/error-messages";

export class SolidRichTextField implements ISolidField {

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
        return this.fieldContext.data[this.fieldContext.field.attrs.name];
    }

    validationSchema(): Yup.Schema {
        let schema: Yup.StringSchema<string | null | undefined> = Yup.string();

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
            schema = schema.min(fieldMetadata.min, ERROR_MESSAGES.FIELD_MINIMUM_CHARACTER(fieldLabel,fieldMetadata.min));
        }
        if (fieldMetadata.max && fieldMetadata.max > 0) {
            schema = schema.max(fieldMetadata.max, ERROR_MESSAGES.FIELD_MAXIMUM_CHARACTER(fieldLabel,fieldMetadata.max));
        }
        // 3. regular expression
        if (fieldMetadata.regexPattern) {
            const regexPatternNotMatchingErrorMsg = fieldMetadata.regexPatternNotMatchingErrorMsg ?? `${fieldLabel} has invalid data.`
            schema = schema.matches(fieldMetadata.regexPattern, regexPatternNotMatchingErrorMsg);
        }

        return schema;
    }

    render(formik: FormikObject) {
        const fieldMetadata = this.fieldContext.fieldMetadata;
        const fieldLayoutInfo = this.fieldContext.field;
        const isFormFieldValid = (formik: any, fieldName: string) => formik.touched[fieldName] && formik.errors[fieldName];
        const className = fieldLayoutInfo.attrs?.className || 'field col-12';


        let viewWidget = fieldLayoutInfo.attrs.viewWidget;
        let editWidget = fieldLayoutInfo.attrs.editWidget;
        if (!editWidget) {
            editWidget = 'DefaultRichTextFormEditWidget';
        }
        if (!viewWidget) {
            viewWidget = 'DefaultRichTextFormViewWidget';
        }
        const viewMode: string = this.fieldContext.viewMode;


        return (
            <>
                <div className={className}>
                    {viewMode === "view" &&
                        this.renderExtensionRenderMode(viewWidget, formik)
                    }
                    {viewMode === "edit" &&
                        <>
                            {editWidget &&
                                this.renderExtensionRenderMode(editWidget, formik)
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



export const DefaultRichTextFormEditWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
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
                <Editor
                    readOnly={formReadonly || fieldReadonly || readOnlyPermission}
                    disabled={formDisabled || fieldDisabled}
                    key={fieldLayoutInfo.attrs.name}  // React will re-render the component whenever this value changes
                    id={fieldLayoutInfo.attrs.name}
                    value={formik.values[fieldLayoutInfo.attrs.name]}
                    onTextChange={e => formik.setFieldValue(fieldLayoutInfo.attrs.name, e.htmlValue)}
                    style={{ height: "320px" }}
                    className="solid-custom-editor"
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

export const DefaultRichTextFormViewWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;
    const [isText, setIsText] = useState(false)
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
                <Editor
                    readOnly={true}
                    key={fieldLabel}  // React will re-render the component whenever this value changes
                    id={fieldLabel}
                    value={formik.values[fieldLayoutInfo.attrs.name]}
                    style={{ height: "320px" }}
                    className="solid-custom-editor"
                />
            </div>
        </div>
    );
}