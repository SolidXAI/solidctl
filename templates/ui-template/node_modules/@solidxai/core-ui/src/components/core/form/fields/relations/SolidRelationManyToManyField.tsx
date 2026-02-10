
import { Message } from "primereact/message";
import { useEffect, useState } from "react";
import * as Yup from 'yup';
import { FormikObject, ISolidField, SolidFieldProps } from "../ISolidField";
import { getExtensionComponent } from "../../../../../helpers/registry";
import { AutoComplete, AutoCompleteCompleteEvent } from "primereact/autocomplete";
import { Button } from "primereact/button";
import { SolidFormFieldWidgetProps } from "../../../../../types/solid-core";
import { useRelationEntityHandler } from "./widgets/helpers/useRelationEntityHandler";
import { InlineRelationEntityDialog } from "./widgets/helpers/InlineRelationEntityDialog";
import { capitalize } from "lodash";
import { Checkbox } from "primereact/checkbox";
import { Panel } from "primereact/panel";
import { SolidFieldTooltip } from "../../../../../components/common/SolidFieldTooltip";
import qs from 'qs';
// import Handlebars from "handlebars/dist/handlebars";
import * as Handlebars from "handlebars";
import { ERROR_MESSAGES } from "../../../../../constants/error-messages";





export class SolidRelationManyToManyField implements ISolidField {

    private fieldContext: SolidFieldProps;

    constructor(fieldContext: SolidFieldProps) {
        this.fieldContext = fieldContext;
    }

    initialValue(): any {

        const manyToManyFieldData = this.fieldContext.data[this.fieldContext.field.attrs.name];
        const fieldMetadata = this.fieldContext.fieldMetadata;
        const userKeyField = fieldMetadata?.relationModel?.userKeyField?.name;
        if (manyToManyFieldData) {
            return manyToManyFieldData.map((e: any) => {
                const manyToManyColVal = e[userKeyField] || '';
                return {
                    label: manyToManyColVal,
                    value: e?.id || '',
                    original: e
                };
            });
        }
        return [];
    }

    updateFormData(value: any, formData: FormData): any {
        const fieldLayoutInfo = this.fieldContext.field;
        //if empty then clear the field
        if(value && value.length === 0) {
            formData.append(`${fieldLayoutInfo.attrs.name}Command`, "clear");
        }
        if (value && value.length > 0) {
            const shouldUseOriginal = value.every((item: any) => item.original && item.original.id);

            value.forEach((item: any, index: number) => {
                if (shouldUseOriginal) {
                    formData.append(
                        `${fieldLayoutInfo.attrs.name}Ids[${index}]`,
                        item.value
                    );
                } else {
                    formData.append(
                        `${fieldLayoutInfo.attrs.name}[${index}]`,
                        JSON.stringify(item.original)
                    );
                }
            });
            if (shouldUseOriginal) {
                formData.append(`${fieldLayoutInfo.attrs.name}Command`, "set")
            } else {
                formData.append(`${fieldLayoutInfo.attrs.name}Command`, "update")

            }

        }
    }

    validationSchema(): Yup.Schema {
        let schema = Yup.array();

        const fieldMetadata = this.fieldContext.fieldMetadata;
        const fieldLayoutInfo = this.fieldContext.field;
        const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;

        // 1. required 
        if (fieldMetadata.required) {
            schema = schema
                .min(1, ERROR_MESSAGES.SELECT_ATLEAST_ONE(fieldLabel))
                .required(ERROR_MESSAGES.FIELD_REUQIRED(fieldLabel));
        }

        return schema;
    }

    render(formik: FormikObject) {
        const fieldMetadata = this.fieldContext.fieldMetadata;
        const fieldLayoutInfo = this.fieldContext.field;
        const className = fieldLayoutInfo.attrs?.className || 'field col-12';

        const isFormFieldValid = (formik: any, fieldName: string) => formik.touched[fieldName] && formik.errors[fieldName];
        const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;

        let viewWidget = fieldLayoutInfo.attrs.viewWidget;
        let editWidget = fieldLayoutInfo.attrs.editWidget;
        if (!editWidget) {
            editWidget = 'DefaultRelationManyToManyAutoCompleteFormEditWidget';
        }
        if (!viewWidget) {
            viewWidget = 'DefaultRelationOneToManyFormViewWidget';
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



export const DefaultRelationManyToManyAutoCompleteFormEditWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const className = fieldLayoutInfo.attrs?.className || 'field col-12';
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;
    const readOnlyPermission = fieldContext.readOnly;
    const disabled = fieldLayoutInfo.attrs?.disabled;
    const readOnly = fieldLayoutInfo.attrs?.readOnly;
    const whereClause = fieldLayoutInfo.attrs.whereClause;

    const [visibleCreateDialog, setVisibleCreateDialog] = useState(false);
    const { autoCompleteItems, fetchRelationEntities, addNewRelation } = useRelationEntityHandler({ fieldContext, formik });
    const isFormFieldValid = (formik: any, fieldName: string) => formik.touched[fieldName] && formik.errors[fieldName];

    // const onChange = (e: any) => {
    //     formik.setFieldValue(fieldContext.field.attrs.name, e.value);
    // };

    const autoCompleteSearch = async (event: AutoCompleteCompleteEvent) => {
        const queryData: any = {
            offset: 0,
            limit: 1000,
            filters: {
                $and: [
                    {
                        [fieldMetadata?.relationModel?.userKeyField?.name]: {
                            [fieldLayoutInfo?.attrs?.autocompleteMatchMode || '$containsi']: event.query
                        }
                    }
                ]
            }
        };
        let fixedFilterToBeApplied = false;
        let fixedFilterParsed = false;

        if (fieldMetadata?.relationFieldFixedFilter || fieldLayoutInfo?.attrs?.whereClause) {
            const convertedFixedFilter = fieldLayoutInfo?.attrs?.whereClause ? fieldLayoutInfo?.attrs?.whereClause : fieldMetadata?.relationFieldFixedFilter;
            fixedFilterToBeApplied = true;
            const fixedFilterTemplate = Handlebars.compile(convertedFixedFilter);
            const renderedFilter = fixedFilterTemplate(formik.values);

            let parsedFilter: any;
            try {
                parsedFilter = JSON.parse(renderedFilter);
                const isValid = (obj: any): boolean => {
                    if (!obj || typeof obj !== 'object') return false;

                    const hasValidValue = (val: any): boolean => {
                        if (val === null || val === undefined || val === '') return false;
                        if (typeof val === 'object') {
                            return Object.values(val).some(hasValidValue);
                        }
                        return true;
                    };

                    return hasValidValue(parsedFilter);
                };

                if (isValid(parsedFilter)) {
                    queryData.filters.$and.push(parsedFilter);
                    fixedFilterParsed = true;
                } else {
                    console.warn(ERROR_MESSAGES.SKIPPING_EMPTY_FIXED_FILTER, parsedFilter);
                }
            } catch (e) {
                console.error(ERROR_MESSAGES.INVALID_JSON_WHERECLAUSE, renderedFilter);
                parsedFilter = {};
            }

        }

        let autocompleteQs = qs.stringify(queryData, {
            encodeValuesOnly: true,
        });
        // if (whereClause) {
        //     autocompleteQs = `${autocompleteQs}&${whereClause}`;
        // }

        if (fixedFilterToBeApplied && !fixedFilterParsed) {
            console.error(ERROR_MESSAGES.FIXED_FILTER_NOT_APPLIED);

        } else {
            //  const autocompleteQs = qs.stringify(queryData, {
            //     encodeValuesOnly: true,
            // });
            fetchRelationEntities(autocompleteQs);
        }
    };

    return (

        <div className="relative">
            <div className="flex flex-column gap-2 mt-1 sm:mt-2 md:mt-3 lg:mt-4">
                {showFieldLabel != false &&
                    <label htmlFor={fieldLayoutInfo.attrs.name} className="form-field-label">
                        {fieldLabel}
                        {fieldMetadata.required && <span className="text-red-500"> *</span>}
                        <SolidFieldTooltip fieldContext={fieldContext} />
                    </label>
                }
                <div className="flex align-items-center gap-3">
                    <AutoComplete
                        readOnly={readOnly || readOnlyPermission}
                        disabled={disabled || readOnlyPermission}
                        multiple
                        {...formik.getFieldProps(fieldLayoutInfo.attrs.name)}
                        id={fieldLayoutInfo.attrs.name}
                        field="label"
                        value={formik.values[fieldLayoutInfo.attrs.name] || ''}
                        dropdown={!readOnlyPermission}
                        suggestions={autoCompleteItems}
                        completeMethod={autoCompleteSearch}
                        onChange={(e) => fieldContext.onChange(e, 'onFieldChange')}
                        className="solid-standard-autocomplete w-full"
                    />
                    {fieldContext.field.attrs.inlineCreate && (
                        <>
                            <div>
                                <Button
                                    icon="pi pi-plus"
                                    rounded
                                    outlined
                                    aria-label="Filter"
                                    type="button"
                                    size="small"
                                    onClick={() => setVisibleCreateDialog(true)}
                                    className="custom-add-button"
                                />
                            </div>
                            <InlineRelationEntityDialog
                                visible={visibleCreateDialog}
                                setVisible={setVisibleCreateDialog}
                                fieldContext={fieldContext}
                                onCreate={addNewRelation}
                            />
                        </>
                    )}
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



export const DefaultRelationManyToManyCheckBoxFormEditWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;

    const readOnlyPermission = fieldContext.readOnly;
    const [visibleCreateDialog, setVisibleCreateDialog] = useState(false);
    const { autoCompleteItems, fetchRelationEntities, addNewRelation } = useRelationEntityHandler({ fieldContext, formik });

    useEffect(() => {
        const fieldMetadata = fieldContext.fieldMetadata;
        const fieldLayoutInfo = fieldContext.field;
        const queryData: any = {
            offset: 0,
            limit: 1000,
            filters: {
                $and: []
            }
        };

        let fixedFilterToBeApplied = false;
        let fixedFilterParsed = false;

        if (fieldMetadata?.relationFieldFixedFilter || fieldLayoutInfo?.attrs?.whereClause) {
            const convertedFixedFilter = fieldLayoutInfo?.attrs?.whereClause ? fieldLayoutInfo?.attrs?.whereClause : fieldMetadata?.relationFieldFixedFilter;
            fixedFilterToBeApplied = true;
            const fixedFilterTemplate = Handlebars.compile(convertedFixedFilter);
            const renderedFilter = fixedFilterTemplate(formik.values);

            let parsedFilter: any;
            try {
                parsedFilter = JSON.parse(renderedFilter);
                const isValid = (obj: any): boolean => {
                    if (!obj || typeof obj !== 'object') return false;

                    const hasValidValue = (val: any): boolean => {
                        if (val === null || val === undefined || val === '') return false;
                        if (typeof val === 'object') {
                            return Object.values(val).some(hasValidValue);
                        }
                        return true;
                    };

                    return hasValidValue(parsedFilter);
                };

                if (isValid(parsedFilter)) {
                    queryData.filters.$and.push(parsedFilter);
                    fixedFilterParsed = true;
                } else {
                    console.warn(ERROR_MESSAGES.SKIPPING_EMPTY_FIXED_FILTER, parsedFilter);
                }
            } catch (e) {
                console.error(ERROR_MESSAGES.INVALID_JSON_WHERECLAUSE, renderedFilter);
                parsedFilter = {};
            }

        }

        if (fixedFilterToBeApplied && !fixedFilterParsed) {
            console.error(ERROR_MESSAGES.FIXED_FILTER_NOT_APPLIED);

        } else {
             const autocompleteQs = qs.stringify(queryData, {
                encodeValuesOnly: true,
            });
            fetchRelationEntities(autocompleteQs);
        }

    }, [fieldContext, formik.values]);

    const handleCheckboxChange = (e: any) => {
        if (formik.values[fieldLayoutInfo.attrs.name].some((item: any) => item.value === e.value)) {
            formik.setFieldValue(fieldLayoutInfo.attrs.name, formik.values[fieldLayoutInfo.attrs.name].filter((s: any) => s.value !== e.value));
        } else {
            formik.setFieldValue(fieldLayoutInfo.attrs.name, [...formik.values[fieldLayoutInfo.attrs.name], e]);
        }
    };

    const headerTemplate = (options: any) => {
        const className = `${options.className} justify-content-space-between`;

        return (
            <div className={className}>
                <div className="flex align-items-center gap-3">
                    {showFieldLabel != false &&
                        <label className="form-field-label">
                            {capitalize(fieldLayoutInfo.attrs.name)}
                            {fieldMetadata.required && <span className="text-red-500"> *</span>}
                            <SolidFieldTooltip fieldContext={fieldContext} />
                        </label>
                    }
                    {fieldContext.field.attrs.inlineCreate && (
                        <>
                            <Button
                                icon="pi pi-plus"
                                rounded
                                outlined
                                aria-label="Filter"
                                type="button"
                                size="small"
                                onClick={() => setVisibleCreateDialog(true)}
                                className="custom-add-button"
                            />
                            <InlineRelationEntityDialog
                                visible={visibleCreateDialog}
                                setVisible={setVisibleCreateDialog}
                                fieldContext={fieldContext}
                                onCreate={addNewRelation}
                            />
                        </>
                    )}
                    {/* <div className="many-to-many-add" >
                        <Button icon="pi pi-plus"
                            rounded
                            outlined
                            aria-label="Filter"
                            type="button"
                            onClick={() => autoCompleteSearch()}
                        />
                    </div> */}
                </div>
                <div>
                    {options.togglerElement}
                </div>
            </div>
        );
    };
    return (
        <div>
            <Panel toggleable headerTemplate={headerTemplate}>
                <div className="formgrid grid">
                    {autoCompleteItems && autoCompleteItems.map((a: any, i: number) => {
                        return (
                            <div key={a.label} className={`field col-6 flex gap-2 ${i >= 2 ? 'mt-3' : ''}`}>
                                <Checkbox
                                    readOnly={readOnlyPermission}
                                    inputId={a.label}
                                    checked={formik.values[fieldLayoutInfo.attrs.name].some((item: any) => item.label === a.label)}
                                    onChange={() => handleCheckboxChange(a)}
                                />
                                <label htmlFor={a.label} className="form-field-label m-0"> {a.label}</label>
                            </div>
                        )
                    })}
                </div>
            </Panel>
        </div>
    )

}
