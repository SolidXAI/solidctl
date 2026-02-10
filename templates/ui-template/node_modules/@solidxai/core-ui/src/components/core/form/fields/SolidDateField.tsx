
import { Calendar } from "primereact/calendar";
import { Message } from "primereact/message";
import { useEffect, useRef, useState } from "react";
import * as Yup from 'yup';
import { FormikObject, ISolidField, SolidFieldProps } from "./ISolidField";
import { getExtensionComponent } from "../../../../helpers/registry";
import { SolidFormFieldWidgetProps, SolidListFieldWidgetProps } from "../../../../types/solid-core";
import { SolidFieldTooltip } from "../../../../components/common/SolidFieldTooltip";
import { ERROR_MESSAGES } from "../../../../constants/error-messages";
import { Tag } from "primereact/tag";
import { StatusIcon } from '../../../../components/core/extension/solid-core/CustomIcon/StatusIcon';
import { DateFieldViewComponent } from '../../../../components/core/common/DateFieldViewComponent';

export class SolidDateField implements ISolidField {

    private fieldContext: SolidFieldProps;

    constructor(fieldContext: SolidFieldProps) {
        this.fieldContext = fieldContext;
    }

    updateFormData(value: any, formData: FormData): any {
        const fieldLayoutInfo = this.fieldContext.field;

        if (value instanceof Date && !isNaN(value.getTime())) {
            const localDate = new Date(value);
            const utcDate = new Date(Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate()));
            // "2025-06-10T00:00:00.000Z"
            const isoString = utcDate.toISOString();
            formData.append(fieldLayoutInfo.attrs.name, isoString.split('T')[0]);
        } else if (value) {
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
        let schema: Yup.DateSchema<Date | null | undefined> = Yup.date();
        const fieldMetadata = this.fieldContext.fieldMetadata;
        const fieldLayoutInfo = this.fieldContext.field;
        const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;

        // 1. required 
        if (fieldMetadata.required) {
            schema = schema.required(ERROR_MESSAGES.FIELD_REUQIRED(fieldLabel));
        } else {
            schema = schema.nullable();
        }
        return schema;
    }

    render(formik: FormikObject) {
        const fieldMetadata = this.fieldContext.fieldMetadata;
        const fieldLayoutInfo = this.fieldContext.field;
        const className = fieldLayoutInfo.attrs?.className || 'field col-12';
        const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
        const isFormFieldValid = (formik: any, fieldName: string) => formik.touched[fieldName] && formik.errors[fieldName];

        let viewWidget = fieldLayoutInfo.attrs.viewWidget;
        let editWidget = fieldLayoutInfo.attrs.editWidget;
        if (!editWidget) {
            editWidget = 'DefaultDateFormEditWidget';
        }
        if (!viewWidget) {
            viewWidget = 'DefaultDateFormViewWidget';
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


export const DefaultDateFormEditWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {

    const [overlayVisible, setOverlayVisible] = useState(false);
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const className = fieldLayoutInfo.attrs?.className || 'field col-12';
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const calendarRef = useRef<any>(null); // Reference for the Calendar component
    const fieldDescription = fieldLayoutInfo.attrs.description ?? fieldMetadata.description;
    const isFormFieldValid = (formik: any, fieldName: string) => formik.touched[fieldName] && formik.errors[fieldName];
    const solidFormViewMetaData = fieldContext.solidFormViewMetaData;
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;
    const readOnlyPermission = fieldContext.readOnly;

    const fieldDisabled = fieldLayoutInfo.attrs?.disabled;
    // const fieldReadonly = fieldLayoutInfo.attrs?.readonly;

    const formDisabled = solidFormViewMetaData.data.solidView?.layout?.attrs?.disabled;

    useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            const inputElement = calendarRef.current?.getInput();
            const overlayElement = calendarRef.current?.getOverlay();

            if (overlayVisible && inputElement && !inputElement.contains(event.target as Node) && overlayElement && !overlayElement.contains(event.target as Node)) {
                setOverlayVisible(false);
            }
        };

        document.addEventListener('mousedown', handleDocumentClick);
        return () => {
            document.removeEventListener('mousedown', handleDocumentClick);
        };
    }, [overlayVisible]);

    const handleInputClick = () => {
        setOverlayVisible(true);
    };


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
                <div onClick={handleInputClick} id={fieldLayoutInfo.attrs.name}>
                    <Calendar
                        disabled={formDisabled || fieldDisabled || readOnlyPermission}
                        ref={calendarRef} // Attach ref to Calendar
                        aria-describedby={`${fieldLayoutInfo.attrs.name}-help`}
                        name={fieldMetadata.name}
                        // onChange={formik.handleChange}
                        onChange={(e) => fieldContext.onChange(e, 'onFieldChange')}
                        //@ts-ignore
                        value={formik.values[fieldLayoutInfo.attrs.name] ? new Date(formik.values[fieldLayoutInfo.attrs.name]) : Date()}
                        // dateFormat="mm/dd/yy"
                        // placeholder="mm/dd/yyyy hh:mm"
                        mask="99/99/9999"
                        hideOnDateTimeSelect
                        appendTo="self"
                        className=""
                        onFocus={() => setOverlayVisible(true)}
                        visible={overlayVisible}
                        onVisibleChange={(e) => {
                            console.log("Overlay visibility changed:", e.visible);
                            setOverlayVisible(e.visible);
                        }}
                        onBlur={(e: React.FocusEvent) => {
                            if (calendarRef.current?.getOverlay()?.contains(e.relatedTarget as Node)) {
                                return;
                            }
                            setOverlayVisible(false);
                        }}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === "Tab") {
                                setOverlayVisible(false);
                            }
                        }
                        }
                    />
                </div>
            </div>
            {isFormFieldValid(formik, fieldLayoutInfo.attrs.name) && (
                <div className="absolute mt-1">
                    <Message severity="error" text={formik?.errors[fieldLayoutInfo.attrs.name]?.toString()} />
                </div>
            )}
        </div>
    );
}
export const DefaultDateFormViewWidget = ({ formik, fieldContext, }: SolidFormFieldWidgetProps) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;

    const fieldName = fieldLayoutInfo.attrs.name;
    const fieldLabel =
        fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;

    const rawValue = formik.values[fieldName];
    const format = fieldLayoutInfo.attrs?.format as string | undefined;


    return (
        <div className="mt-2 flex flex-column gap-2">
            {showFieldLabel !== false && (
                <p className="m-0 form-field-label font-medium">
                    {fieldLabel}
                </p>
            )}

            <p className="m-0">
                {/* {displayValue ?? "-"} */}
                <DateFieldViewComponent value={rawValue} format={format} fallback="-"></DateFieldViewComponent>
            </p>
        </div>
    );
};


export const PublishedStatusListViewWidget = ({ rowData, solidListViewMetaData, fieldMetadata, column }: SolidListFieldWidgetProps) => {

    const colVal = rowData[column.attrs.name]; // publishedAt value

    const isPublished = !!colVal;

    return (
        <StatusIcon isPublished={isPublished} />
    );
};
