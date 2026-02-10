
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import * as Yup from 'yup';
import { FormikObject, ISolidField, SolidFieldProps } from "./ISolidField";
// import { Editor } from "primereact/editor";
import { useEffect, useRef, useState } from "react";
import { getExtensionComponent } from "../../../../helpers/registry";
import { SolidFormFieldWidgetProps } from "../../../../types/solid-core";
import { SolidFieldTooltip } from "../../../../components/common/SolidFieldTooltip";
import Editor from '@monaco-editor/react';
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { ERROR_MESSAGES } from "../../../../constants/error-messages";


export class SolidLongTextField implements ISolidField {

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

        const existingValue = this.fieldContext.data[fieldName];

        return existingValue !== undefined && existingValue !== null ? existingValue : fieldDefaultValue || '';
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
        const fieldLayoutInfo = this.fieldContext.field;
        const className = fieldLayoutInfo.attrs?.className || 'field col-12';
        const isFormFieldValid = (formik: any, fieldName: string) => formik.touched[fieldName] && formik.errors[fieldName];

        let viewWidget = fieldLayoutInfo.attrs.viewWidget;
        let editWidget = fieldLayoutInfo.attrs.editWidget;
        if (!editWidget) {
            editWidget = 'DefaultLongTextFormEditWidget';
        }
        if (!viewWidget) {
            viewWidget = 'DefaultShortTextFormViewWidget';
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

export const DefaultLongTextFormEditWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {

    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const solidFormViewMetaData = fieldContext.solidFormViewMetaData;
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;
    const readOnlyPermission = fieldContext.readOnly;


    const fieldDisabled = fieldLayoutInfo.attrs?.disabled;
    const fieldReadonly = fieldLayoutInfo.attrs?.readonly;

    const formDisabled = solidFormViewMetaData.data.solidView?.layout?.attrs?.disabled;
    const formReadonly = solidFormViewMetaData.data.solidView?.layout?.attrs?.readonly;
    const isFormFieldValid = (formik: any, fieldName: string) => formik.touched[fieldName] && formik.errors[fieldName];

    return (
        <div className="relative">
            <div className="flex flex-column gap-2 mt-1 sm:mt-2 md:mt-3 lg:mt-4">
                {showFieldLabel != false &&
                    <label htmlFor={fieldLayoutInfo.attrs.name} className="form-field-label">{fieldLabel}
                        {fieldMetadata.required && <span className="text-red-500"> *</span>}
                        <SolidFieldTooltip fieldContext={fieldContext} />
                        {/* &nbsp;   {fieldDescription && <span>({fieldDescription}) </span>} */}
                    </label>
                }
                <InputTextarea
                    readOnly={formReadonly || fieldReadonly || readOnlyPermission}
                    disabled={formDisabled || fieldDisabled}
                    id={fieldLayoutInfo.attrs.name}
                    aria-describedby={`${fieldLayoutInfo.attrs.name}-help`}
                    // onChange={formik.handleChange}
                    onChange={(e) => fieldContext.onChange(e, 'onFieldChange')}
                    value={formik.values[fieldLayoutInfo.attrs.name] || ''}
                    rows={5}
                    cols={30}
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

export const DynamicJsonEditorFormViewWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;

    const readOnly = fieldLayoutInfo.attrs?.readonly || fieldContext.readOnly;
    const disabled = fieldLayoutInfo.attrs?.disabled;

    // Default to SQL
    const language = fieldLayoutInfo.attrs.editorLanguage || 'ts';

    const value = formik.values[fieldLayoutInfo.attrs.name] || '';

    const isFormFieldValid = (formik: any, fieldName: string) =>
        formik.touched[fieldName] && formik.errors[fieldName];

    // Sample schema, this comes from the metadata...
    // {
    //     key1: {
    //         required: true,
    //         type: "string",
    //     },
    //     key2: {
    //         required: true,
    //         type: "selectionStatic",
    //         allowedValues: [
    //             "selection static val 1",
    //             "selection static val 2",
    //             "selection static val 3",
    //             "selection static val 4",
    //         ],
    //     },
    // };
    const fieldJsonSchema = fieldLayoutInfo.attrs?.jsonSchema;
    if (!fieldJsonSchema) {
        return <Message severity="error" text="Field Layout Attributes are missing jsonSchema, cannot render with widget jsonEditor without specifying the schema" />
    }
    const [data, setData] = useState(JSON.parse(value || '[]'));

    const renderInput = (value: any, key: string, index: number) => {
        // @ts-ignore
        const meta: any = fieldJsonSchema[key];
        if (!meta) return null;

        if (meta.type === "string" || meta.type === "shortText") {
            return (
                <InputText value={value} readOnly disabled />
            );
        }
        if (meta.type === "longText") {
            return (
                <InputTextarea value={value} rows={10} cols={100} readOnly />
            );
        }
        if (meta.type === "date" || meta.type === "datetime") {
            return (
                <Calendar
                    value={value ? new Date(value) : null}
                    showTime={meta.type === "datetime"}
                    dateFormat="yy-mm-dd"
                    readOnlyInput
                    disabled
                />
            );
        }

        if (meta.type === "selectionStatic") {
            return (
                <Dropdown
                    value={value}
                    // @ts-ignore
                    options={meta.allowedValues.map((v) => ({ label: v, value: v }))}
                    placeholder="Select."
                    readOnly
                    disabled
                />
            );
        }

        return null;
    };

    return (
        <div className="mt-4">
            {fieldLayoutInfo?.attrs?.showLabel !== false && (
                <label className="form-field-label mb-10">
                    {fieldLabel}
                    {fieldMetadata.required && <span className="text-red-500"> *</span>}
                    <SolidFieldTooltip fieldContext={fieldContext} />
                </label>
            )}

            <div className="p-4 border-round surface-card shadow-1">

                <div className="flex flex-column gap-2">
                    {
                        // @ts-ignore
                        data.map((row, idx) => (
                            <div
                                key={idx}
                                className={`flex ${fieldLayoutInfo.attrs?.className ? `flex-${fieldLayoutInfo.attrs?.className}` : 'flex-row'} border-1 border-round p-3 gap-2`}
                            >
                                {Object.keys(fieldJsonSchema).map((key) => (
                                    <div key={key} className="flex flex-column gap-1">
                                        <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                                        {
                                            // @ts-ignore
                                            renderInput(row[key], key, idx)
                                        }
                                    </div>
                                ))}

                            </div>
                        ))
                    }
                </div>

            </div>
        </div>
    );
}

export const DynamicJsonEditorFormEditWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;

    const readOnly = fieldLayoutInfo.attrs?.readonly || fieldContext.readOnly;
    const disabled = fieldLayoutInfo.attrs?.disabled;

    // Default to SQL
    const language = fieldLayoutInfo.attrs.editorLanguage || 'ts';

    const value = formik.values[fieldLayoutInfo.attrs.name] || '';

    const isFormFieldValid = (formik: any, fieldName: string) =>
        formik.touched[fieldName] && formik.errors[fieldName];

    // Sample schema, this comes from the metadata...
    // {
    //     key1: {
    //         required: true,
    //         type: "string",
    //     },
    //     key2: {
    //         required: true,
    //         type: "selectionStatic",
    //         allowedValues: [
    //             "selection static val 1",
    //             "selection static val 2",
    //             "selection static val 3",
    //             "selection static val 4",
    //         ],
    //     },
    // };
    const fieldJsonSchema = fieldLayoutInfo.attrs?.jsonSchema;
    if (!fieldJsonSchema) {
        return <Message severity="error" text="Field Layout Attributes are missing jsonSchema, cannot render with widget jsonEditor without specifying the schema" />
    }
    const [data, setData] = useState(JSON.parse(value || '[]'));

    const handleAllChange = (updated: any) => {
        setData(updated);
        formik.setFieldValue(fieldLayoutInfo.attrs.name, JSON.stringify(updated));
    }

    const handleChange = (index: number, key: string, value: any) => {
        const updated = [...data];
        // @ts-ignore
        updated[index][key] = value;
        handleAllChange(updated);
    };

    const handleAdd = () => {
        const newItem = {};
        Object.keys(fieldJsonSchema).forEach((key) => {
            // @ts-ignore
            newItem[key] = "";
        });
        // @ts-ignore
        handleAllChange([...data, newItem]);
    };

    const handleRemove = (index: number) => {
        const updated = [...data];
        updated.splice(index, 1);
        handleAllChange(updated);
    };

    const renderInput = (value: any, key: string, index: number) => {
        // @ts-ignore
        const meta: any = fieldJsonSchema[key];
        if (!meta) return null;

        if (meta.type === "string" || meta.type === "shortText") {
            return (
                <InputText
                    value={value}
                    onChange={(e) => handleChange(index, key, e.target.value)}
                    disabled={!!disabled}
                    readOnly={!!readOnly}
                />
            );
        }

        if (meta.type === "longText") {
            return (
                <InputTextarea
                    onChange={(e) => handleChange(index, key, e.target.value)}
                    value={value}
                    rows={10}
                    cols={100}
                />
            );
        }

        if (meta.type === "date" || meta.type === "datetime") {
            return (
                <Calendar
                    value={value ? new Date(value) : null}
                    onChange={(e) => handleChange(index, key, e.value)}
                    showTime={meta.type === "datetime"}
                    dateFormat="yy-mm-dd"
                    disabled={!!disabled}
                    readOnlyInput={!!readOnly}
                />
            );
        }

        if (meta.type === "selectionStatic") {
            return (
                <Dropdown
                    value={value}
                    // @ts-ignore
                    options={meta.allowedValues.map((v) => ({ label: v, value: v }))}
                    onChange={(e) => handleChange(index, key, e.value)}
                    placeholder="Select."
                    disabled={!!disabled}
                    readOnly={!!readOnly}
                />
            );
        }

        return null;
    };

    return (
        <div className="mt-4">
            {fieldLayoutInfo?.attrs?.showLabel !== false && (
                <label className="form-field-label mb-10">
                    {fieldLabel}
                    {fieldMetadata.required && <span className="text-red-500"> *</span>}
                    <SolidFieldTooltip fieldContext={fieldContext} />
                </label>
            )}

            <div className="p-4 border-round surface-card shadow-1">
                <div className="flex justify-content-between align-items-center mb-3">
                    {!disabled && !readOnly ? (
                        <Button
                            type="button"
                            label="Add"
                            icon="pi pi-plus"
                            onClick={handleAdd}
                        />
                    ) : null}
                </div>

                <div className="flex flex-column gap-2">
                    {
                        // @ts-ignore
                        data.map((row, idx) => (
                            <div
                                key={idx}
                                className={`flex ${fieldLayoutInfo.attrs?.className ? `flex-${fieldLayoutInfo.attrs?.className}` : 'flex-row'} border-1 border-round p-3 gap-2`}
                            >
                                <div className="flex gap-3 align-items-center">
                                    {Object.keys(fieldJsonSchema).map((key) => (
                                        <div key={key} className="flex flex-column gap-1">
                                            <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                                            {
                                                // @ts-ignore
                                                renderInput(row[key], key, idx)
                                            }
                                        </div>
                                    ))}
                                </div>
                                {!disabled && !readOnly ? (
                                    <Button
                                        type="button"
                                        icon="pi pi-minus"
                                        className="ml-2 h-2rem w-2rem rounded-circle"
                                        onClick={() => handleRemove(idx)}
                                    />
                                ) : null}
                            </div>
                        ))
                    }
                </div>

                {
                    fieldLayoutInfo.attrs?.jsonSchemaShowPreview &&
                    <pre className="mt-4 bg-gray-100 p-3 border-round overflow-auto">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                }
            </div>
        </div>
    );
};

export const CodeEditorFormEditWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;

    const readOnly = fieldLayoutInfo.attrs?.readonly || fieldContext.readOnly;
    const disabled = fieldLayoutInfo.attrs?.disabled;

    // Default to SQL
    const language = fieldLayoutInfo.attrs.editorLanguage || 'ts';

    const value = formik.values[fieldLayoutInfo.attrs.name] || '';

    const isFormFieldValid = (formik: any, fieldName: string) =>
        formik.touched[fieldName] && formik.errors[fieldName];

    return (
        <div className="mt-4">
            {fieldLayoutInfo?.attrs?.showLabel !== false && (
                <label className="form-field-label mb-10">
                    {fieldLabel}
                    {fieldMetadata.required && <span className="text-red-500"> *</span>}
                    <SolidFieldTooltip fieldContext={fieldContext} />
                </label>
            )}

            <div className="border border-gray-300 rounded overflow-hidden">
                <Editor
                    height="200px"
                    defaultLanguage={language}
                    value={value}
                    onChange={(val) => formik.setFieldValue(fieldLayoutInfo.attrs.name, val)}
                    options={{
                        readOnly,
                        minimap: { enabled: false },
                        lineNumbers: 'on',
                        fontSize: 14,
                        scrollBeyondLastLine: false,
                    }}
                />
            </div>

            {isFormFieldValid(formik, fieldLayoutInfo.attrs.name) && (
                <div className="mt-1">
                    <Message text={formik.errors[fieldLayoutInfo.attrs.name]?.toString()} />
                </div>
            )}
        </div>
    );
};

export const DynamicSelectionStaticEditWidget = ({
    formik,
    fieldContext,
}: SolidFormFieldWidgetProps) => {
    const fieldLayoutInfo = fieldContext.field;
    const fieldJsonSchema = fieldLayoutInfo.attrs.jsonSchema;
    const name = fieldLayoutInfo.attrs.name;
    const readOnly = fieldLayoutInfo.attrs?.readonly || fieldContext.readOnly;
    const disabled = fieldLayoutInfo.attrs?.disabled;

    const value = formik.values[name] || "{}";
    const [data, setData] = useState(JSON.parse(value || "{}"));

    const handleChange = (key: string, value: any) => {
        const updated = { ...data, [key]: value };
        setData(updated);
        formik.setFieldValue(name, JSON.stringify(updated));
    };

    const renderInput = (key: string) => {
        const meta: any = fieldJsonSchema[key];
        const val = data[key];

        if (meta?.type === "selectionStatic") {
            return (
                <Dropdown
                    value={val}
                    options={meta.allowedValues.map((v:any) => ({
                        label: v,
                        value: v,
                    }))}
                    onChange={(e) => handleChange(key, e.value)}
                    placeholder={meta.placeHolder || "Select."}
                    disabled={!!disabled}
                    readOnly={!!readOnly}
                    className="w-full"
                />
            );
        }

        return null;
    };
    const shouldShowField = (key: string) => {
        const meta = fieldJsonSchema[key];

        if (!meta?.visibility) return true; // default show

        if (meta.visibility === "parent") {
            const parentKey = Object.keys(fieldJsonSchema)[0]; // assume first field is parent
            return !!data[parentKey]; // show only if parent has value
        }

        return true;
    };

    return (
      <div className="flex gap-3 align-items-center">
        {Object.keys(fieldJsonSchema).map((key) => {
          const meta: any = fieldJsonSchema[key];
           if (!shouldShowField(key)) return null;
          return (
            <div key={key} className={"flex flex-column gap-2 " + (meta.className || '')}>
              {/*load prime header icon and headerText */}
              {(meta.headerText || meta.headerIcon) && (
                <div className="flex align-items-center gap-2">
                  {meta.headerIcon && <i className={meta.headerIcon}></i>}
                  <span className="font-semibold form-field-label font-medium">
                    {meta.headerText ?? key}
                  </span>
                </div>
              )}
              {/* Notes below input */}
                {meta.noteText && (
                    <small className="text-secondary mt-2">{meta.noteText}</small>
                )}
              {/*load note here */}
              <label className="form-field-label font-medium">{key.charAt(0).toUpperCase() + key.slice(1)} {meta.required && <span className="text-red-500">*</span>}</label>
              <div className="w-full mt-1 flex flex-row gap-2">
              {renderInput(key)}
              </div>
            </div>
          );
        })}
      </div>
    );
};

