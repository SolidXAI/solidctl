
import { createSolidEntityApi } from "../../../../../redux/api/solidEntityApi";
import { AutoComplete, AutoCompleteCompleteEvent } from "primereact/autocomplete";
import { Message } from "primereact/message";
import qs from "qs";
import { useEffect, useRef, useState } from "react";
import * as Yup from 'yup';
import { FormikObject, ISolidField, SolidFieldProps } from "../ISolidField";
import { camelCase } from "lodash";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import SolidFormView from '../../../../../components/core/form/SolidFormView';
import { getExtensionComponent } from "../../../../../helpers/registry";
import { SolidFormFieldWidgetProps } from "../../../../../types/solid-core";
import showToast from "../../../../../helpers/showToast";
// import Handlebars from "handlebars/dist/handlebars";
import * as Handlebars from "handlebars";
import { Toast } from "primereact/toast";
import { SolidFieldTooltip } from "../../../../../components/common/SolidFieldTooltip";
import { ERROR_MESSAGES } from "../../../../../constants/error-messages";
import { getVirtualScrollerOptions } from "../../../../../helpers/autoCompleteVirtualScroll";


export type FormViewParams = {
    moduleName: any;
    modelName: any;
    id: any;
    embeded: any;
    inlineCreateAutoSave: any;
    layout: any;
}

export class SolidRelationManyToOneField implements ISolidField {

    private fieldContext: SolidFieldProps;

    constructor(fieldContext: SolidFieldProps) {
        this.fieldContext = fieldContext;
    }

    initialValue(): any {

        const manyToOneFieldData = this.fieldContext?.data[this.fieldContext?.field?.attrs?.name];
        const fieldMetadata = this.fieldContext?.fieldMetadata;
        const userKeyField = fieldMetadata?.relationModel?.userKeyField?.name;
        const manyToOneColVal = manyToOneFieldData ? manyToOneFieldData[userKeyField] : '';
        if (manyToOneColVal) {
            return { solidManyToOneLabel: manyToOneColVal || '', solidManyToOneValue: manyToOneFieldData?.id || '', ...manyToOneFieldData };
        }
        if (this.fieldContext.parentData) {
            const parentDataForKey = this.fieldContext.parentData[userKeyField];
            if (parentDataForKey && typeof parentDataForKey === 'object') {
                const [key, value]: any = Object.entries(this.fieldContext.parentData)[0] || [];
                if (key && value !== undefined) {
                    return { solidManyToOneLabel: value.solidManyToOneLabel, solidManyToOneValue: value.solidManyToOneValue };
                }
            }
        }
        return {}
    }

    updateFormData(value: any, formData: FormData): any {
        const fieldLayoutInfo = this.fieldContext.field;
        if (value?.solidManyToOneValue) {
            formData.append(`${fieldLayoutInfo.attrs.name}Id`, value.solidManyToOneValue);
        }
    }

    validationSchema(): Yup.Schema {
        const fieldMetadata = this.fieldContext.fieldMetadata;
        const fieldLayoutInfo = this.fieldContext.field;
        const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;

        let schema = Yup.mixed();
        // Custom validation for relation field
        if (fieldMetadata.required) {
            schema = schema.test(
                ERROR_MESSAGES.REQUIRED_REALTION,
                ERROR_MESSAGES.FIELD_REUQIRED(fieldLabel),
                function (value: any) {
                    // Handle empty values
                    if (!value) return false;

                    // If it's an object with solidManyToOneValue, check if it's valid
                    if (typeof value === 'object' && value !== null && (value as any).solidManyToOneValue) {
                        return true;
                    }

                    // If it's a string (user typed but didn't select), it's invalid for required field
                    if (typeof value === 'string') {
                        return false;
                    }

                    return false;
                }
            );
        }

        // Add validation to ensure valid selection
        schema = schema.test(
            ERROR_MESSAGES.VALIDATE_SELECTION,
            ERROR_MESSAGES.SELECT_VALID_FROM_DROPDOWN(fieldLabel),
            function (value: any) {
                // If not required and empty, it's valid
                if (!fieldMetadata.required && (!value || value === '')) {
                    return true;
                }

                // If it's an object with solidManyToOneValue, it's a valid selection
                if (typeof value === 'object' && value !== null && (value as any).solidManyToOneValue) {
                    return true;
                }

                // If it's a string (user typed but didn't select), it's invalid
                if (typeof value === 'string' && value.trim() !== '') {
                    return false;
                }

                // Empty value for non-required field
                return !fieldMetadata.required;
            }
        );

        return schema;
    }


    render(formik: FormikObject) {
        const fieldMetadata = this.fieldContext.fieldMetadata;
        const fieldLayoutInfo = this.fieldContext.field;
        const isFormFieldValid = (formik: any, fieldName: string) => formik.touched[fieldName] && formik.errors[fieldName];
        const className = fieldLayoutInfo.attrs?.className || 'field col-12';

        let isVisible = fieldLayoutInfo.attrs?.visible || true;
        if (this.fieldContext.parentData && this.fieldContext.parentFieldName === fieldLayoutInfo.attrs.name) {
            isVisible = false;
        }

        // const isVisible = this.fieldContext.parentData ? fieldLayoutInfo.attrs?.visible === true : fieldLayoutInfo.attrs?.visible !== false;

        if (!isVisible) {
            return null;
        }

        let viewWidget = fieldLayoutInfo.attrs.viewWidget;
        let editWidget = fieldLayoutInfo.attrs.editWidget;
        if (!editWidget) {
            editWidget = 'DefaultRelationManyToOneFormEditWidget';
        }
        if (!viewWidget) {
            viewWidget = 'DefaultRelationManyToOneFormViewWidget';
        }
        const viewMode: string = this.fieldContext.viewMode;
        return (
            <>
                <div className={className}>
                    {viewMode === "view" && this.renderExtensionRenderMode(viewWidget, formik)}
                    {viewMode === "edit" && (<>{editWidget && this.renderExtensionRenderMode(editWidget, formik)}</>)}
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

export const DefaultRelationManyToOneFormEditWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const toast = useRef<Toast>(null);

    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const className = fieldLayoutInfo.attrs?.className || 'field col-12';
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const solidFormViewMetaData = fieldContext.solidFormViewMetaData;
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;
    const readOnlyPermission = fieldContext.readOnly;
    const [visibleCreateRelationEntity, setvisibleCreateRelationEntity] = useState(false);
    const [formViewParams, setformViewParams] = useState<FormViewParams>()
    // auto complete specific code. 
    const entityApi = createSolidEntityApi(fieldMetadata.relationCoModelSingularName);
    const { useLazyGetSolidEntitiesQuery } = entityApi;
    const [triggerGetSolidEntities] = useLazyGetSolidEntitiesQuery();

    const fieldDisabled = fieldLayoutInfo.attrs?.disabled;
    const fieldReadonly = fieldLayoutInfo.attrs?.readonly;

    const formDisabled = solidFormViewMetaData.data.solidView?.layout?.attrs?.disabled;
    const formReadonly = solidFormViewMetaData.data.solidView?.layout?.attrs?.readonly;
    const whereClause = fieldLayoutInfo.attrs.whereClause;

    const [autoCompleteItems, setAutoCompleteItems] = useState<any[]>([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [currentQuery, setCurrentQuery] = useState("");
    const LIMIT = 50;
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const formviewparams: FormViewParams = {
            moduleName: fieldContext.fieldMetadata.relationModelModuleName,
            modelName: camelCase(fieldContext.fieldMetadata.relationCoModelSingularName),
            id: "new",
            embeded: true,
            inlineCreateAutoSave: fieldLayoutInfo?.attrs?.inlineCreateAutoSave,
            layout: fieldLayoutInfo?.attrs?.inlineCreateLayout
        }
        setformViewParams(formviewparams);
    }, [])

    const autoCompleteSearch = async (event: AutoCompleteCompleteEvent) => {
        setOffset(0);
        setCurrentQuery(event.query || "");
        setHasMore(true);
        // Get the list view layout & metadata first. 
        const queryData = {
            offset: 0,
            limit: LIMIT,
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
        if (solidFormViewMetaData?.data?.solidView?.model?.singularName === "listOfValues" && fieldContext.fieldMetadata.relationCoModelSingularName !== "moduleMetadata") {
            fixedFilterToBeApplied = true;
        }
        if (fieldMetadata?.relationFieldFixedFilter || fieldLayoutInfo?.attrs?.whereClause) {
            const convertedFixedFilter = fieldLayoutInfo?.attrs?.whereClause ? fieldLayoutInfo?.attrs?.whereClause : fieldMetadata?.relationFieldFixedFilter;
            fixedFilterToBeApplied = true;
            const fixedFilterTemplate = Handlebars.compile(convertedFixedFilter);
            const renderedFilter = fixedFilterTemplate(formik.values);

            // Parse the result into a JS object
            let parsedFilter;
            try {
                parsedFilter = JSON.parse(renderedFilter);
                const isValid = (obj: any): boolean => {
                    if (!obj || typeof obj !== 'object') return false;

                    // Recursively check all nested values
                    const hasValidValue = (val: any): boolean => {
                        if (val === null || val === undefined || val === '') return false;
                        if (typeof val === 'object') {
                            return Object.values(val).some(hasValidValue);
                        }
                        return true;
                    };

                    return hasValidValue(obj);
                };

                if (isValid(parsedFilter)) {
                    queryData.filters.$and.push(parsedFilter);
                    fixedFilterParsed = true;
                } else {
                    console.warn(ERROR_MESSAGES.SKIPPING_EMPTY_FIXED_FILTER, parsedFilter);
                }
            } catch (e) {
                console.error(ERROR_MESSAGES.INVALID_JSON_WHERECLAUSE, renderedFilter);
                parsedFilter = {}; // fallback or throw error as needed
            }

        }

        let autocompleteQs = qs.stringify(queryData, {
            encodeValuesOnly: true,
        });
        // if (whereClause) {
        //     autocompleteQs = `${autocompleteQs}&${whereClause}`;
        // }


        if (fixedFilterToBeApplied && !fixedFilterParsed) {
            showToast(toast, "error", ERROR_MESSAGES.SELECT_RELEVANT_FIELD, ERROR_MESSAGES.FIELD_NOT_SELECT);

        } else {
            try {
                setLoading(true);
                // TODO: do error handling here, possible errors like modelname is incorrect etc...
                const autocompleteResponse = await triggerGetSolidEntities(autocompleteQs);

                // TODO: if no data found then can we show no matching "entities", where entities can be replaced with the model plural name,
                const autocompleteData = autocompleteResponse.data;

                if (autocompleteData) {
                    const autoCompleteItems = autocompleteData.records.map((item: any) => {
                        return {
                            solidManyToOneLabel: item[fieldMetadata?.relationModel?.userKeyField?.name],
                            solidManyToOneValue: item['id'],
                            ...item,
                        }
                    });
                    setAutoCompleteItems(autoCompleteItems);
                    setOffset(autocompleteData.records.length);
                    setHasMore(autocompleteData.records.length === LIMIT);
                }
            }
            finally {
                setLoading(false);
            }
        }


    }

    const onLazyLoad = async (event: { first: number; last: number }) => {
        if (!hasMore || loading) return;
        if (event.last < autoCompleteItems.length - 1) return; // Only load if user reaches bottom

        const queryData = {
            offset: offset,
            limit: LIMIT,
            filters: {
                $and: [
                    {
                        [fieldMetadata?.relationModel?.userKeyField?.name]: {
                            [fieldLayoutInfo?.attrs?.autocompleteMatchMode || '$containsi']: currentQuery
                        }
                    }
                ]
            }
        };

        let fixedFilterToBeApplied = false;
        let fixedFilterParsed = false;
        if (solidFormViewMetaData?.data?.solidView?.model?.singularName === "listOfValues" && fieldContext.fieldMetadata.relationCoModelSingularName !== "moduleMetadata") {
            fixedFilterToBeApplied = true;
        }
        if (fieldMetadata?.relationFieldFixedFilter || fieldLayoutInfo?.attrs?.whereClause) {
            const convertedFixedFilter = fieldLayoutInfo?.attrs?.whereClause ? fieldLayoutInfo?.attrs?.whereClause : fieldMetadata?.relationFieldFixedFilter;
            fixedFilterToBeApplied = true;
            const fixedFilterTemplate = Handlebars.compile(convertedFixedFilter);
            const renderedFilter = fixedFilterTemplate(formik.values);

            // Parse the result into a JS object
            let parsedFilter;
            try {
                parsedFilter = JSON.parse(renderedFilter);
                const isValid = (obj: any): boolean => {
                    if (!obj || typeof obj !== 'object') return false;

                    // Recursively check all nested values
                    const hasValidValue = (val: any): boolean => {
                        if (val === null || val === undefined || val === '') return false;
                        if (typeof val === 'object') {
                            return Object.values(val).some(hasValidValue);
                        }
                        return true;
                    };

                    return hasValidValue(obj);
                };

                if (isValid(parsedFilter)) {
                    queryData.filters.$and.push(parsedFilter);
                    fixedFilterParsed = true;
                } else {
                    console.warn(ERROR_MESSAGES.SKIPPING_EMPTY_FIXED_FILTER, parsedFilter);
                }
            } catch (e) {
                console.error(ERROR_MESSAGES.INVALID_JSON_WHERECLAUSE, renderedFilter);
                parsedFilter = {}; // fallback or throw error as needed
            }

        }

        const autocompleteQs = qs.stringify(queryData, { encodeValuesOnly: true });
        if (fixedFilterToBeApplied && !fixedFilterParsed) {
            showToast(toast, "error", ERROR_MESSAGES.SELECT_RELEVANT_FIELD, ERROR_MESSAGES.FIELD_NOT_SELECT);

        } else {
            try {
                setLoading(true);
                const response = await triggerGetSolidEntities(autocompleteQs);
                const records = response.data?.records || [];
                if (records.length < LIMIT) setHasMore(false);
                setAutoCompleteItems(prev => [...prev, ...records.map((item: any) => ({
                    solidManyToOneLabel: item[fieldMetadata?.relationModel?.userKeyField?.name],
                    solidManyToOneValue: item.id,
                    ...item
                }))]);
                setOffset(prev => prev + records.length);
            } finally {
                setLoading(false);
            }
        }
    };

    const isFormFieldValid = (formik: any, fieldName: string) => formik.touched[fieldName] && formik.errors[fieldName];

    const customCreateHandler = (values: any) => {
        const currentRelationData = formik.values[fieldLayoutInfo.attrs.name] || [];
        const jsonValues = Object.fromEntries(values.entries());
        const updatedRelationData = [
            ...currentRelationData,
            {
                solidManyToOneLabel: jsonValues[fieldMetadata?.relationModel?.userKeyField?.name],
                solidManyToOneValue: "new",
                original: jsonValues,
            },
        ];

        formik.setFieldValue(fieldLayoutInfo.attrs.name, updatedRelationData);

    }
    return (
        <div className="relative">
            <Toast ref={toast} />
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
                        readOnly={formReadonly || fieldReadonly || readOnlyPermission}
                        disabled={formDisabled || fieldDisabled || readOnlyPermission}
                        {...formik.getFieldProps(fieldLayoutInfo.attrs.name)}
                        id={fieldLayoutInfo.attrs.name}
                        field="solidManyToOneLabel"
                        value={formik.values[fieldLayoutInfo.attrs.name] || ''}
                        dropdown={!readOnlyPermission}
                        suggestions={autoCompleteItems}
                        completeMethod={autoCompleteSearch}
                        onChange={(e) => fieldContext.onChange(e, 'onFieldChange')}
                        onFocus={(e) => e.target.select()}
                        className="w-full solid-standard-autocomplete"
                        // virtualScrollerOptions={{
                        //     itemSize: 38,
                        //     lazy: true,
                        //     onLazyLoad
                        // }}
                        virtualScrollerOptions={getVirtualScrollerOptions({
                            itemsLength: autoCompleteItems.length,
                            lazy: true,
                            onLazyLoad,
                        })}
                    />
                    {fieldLayoutInfo.attrs.inlineCreate === "true" && readOnlyPermission === false && formViewParams &&
                        <RenderSolidFormEmbededView formik={formik} fieldContext={fieldContext} customCreateHandler={customCreateHandler} visibleCreateRelationEntity={visibleCreateRelationEntity} setvisibleCreateRelationEntity={setvisibleCreateRelationEntity} formViewParams={formViewParams}></RenderSolidFormEmbededView>
                    }
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

export const RenderSolidFormEmbededView = ({ formik, fieldContext, customCreateHandler, visibleCreateRelationEntity, setvisibleCreateRelationEntity, formViewParams }: any) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const className = fieldLayoutInfo.attrs?.className || 'field col-6 flex flex-column gap-2 mt-1 sm:mt-2 md:mt-3 lg:mt-4';
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const parentModelName = fieldLayoutInfo?.attrs?.parentModelName;
    const childModelName = fieldLayoutInfo?.attrs?.childModelName;
    const parentFieldName = fieldLayoutInfo?.attrs?.parentFieldName;
    const childFieldName = fieldLayoutInfo?.attrs?.childFieldName;
    const parentModuleName = fieldLayoutInfo?.attrs?.parentModuleName;


    const params = {
        moduleName: formViewParams.moduleName,
        modelName: camelCase(formViewParams.modelName),
        id: formViewParams.id,
        embeded: formViewParams.embeded,
        inlineCreateAutoSave: formViewParams.inlineCreateAutoSave,
        layout: formViewParams.layout,
        customCreateHandler: ((values: any) => {
            setvisibleCreateRelationEntity(false);
            customCreateHandler(values)
        }),
        handlePopupClose: (() => {
            setvisibleCreateRelationEntity(false);
        }),
    }
    return (
        <div>
            <div>
                <Button
                    icon="pi pi-plus"
                    rounded
                    outlined
                    aria-label="Filter"
                    type="button"
                    size="small"
                    onClick={() => setvisibleCreateRelationEntity(true)}
                    className="custom-add-button"
                />
            </div>
            <Dialog
                header=""
                showHeader={false}
                visible={visibleCreateRelationEntity}
                style={{
                    width: fieldLayoutInfo?.attrs?.inlineCreateLayout?.attrs?.width ?? "60vw",
                    height: fieldLayoutInfo?.attrs?.inlineCreateLayout?.attrs?.height ?? "auto"
                }}
                onHide={() => {
                    if (!visibleCreateRelationEntity) return;
                    setvisibleCreateRelationEntity(false);
                }}
                className="solid-dialog"
                breakpoints={{ '1199px': '35rem', "767px": '85vw', "550px": '90vw' }}

            >
                <SolidFormView {...params} />

            </Dialog>
        </div>
    )
}


export const DefaultRelationManyToOneFormViewWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {

    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;
    const value = formik.values[fieldLayoutInfo.attrs.name];
    const userKeyField = fieldLayoutInfo?.attrs?.coModelFieldToDisplay ? fieldLayoutInfo?.attrs?.coModelFieldToDisplay : fieldMetadata?.relationModel?.userKeyField?.name;
    const displayValue = value?.[userKeyField];
    return (
        <div className="mt-2 flex-column gap-2">
            {showFieldLabel !== false && (
                <p className="m-0 form-field-label font-medium">{fieldLabel}</p>
            )}
            <p className="m-0">{displayValue}</p>
        </div>
    );
}





export const PseudoRelationManyToOneFormWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const toast = useRef<Toast>(null);

    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const className = fieldLayoutInfo.attrs?.className || 'field col-12';
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const solidFormViewMetaData = fieldContext.solidFormViewMetaData;
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;
    const readOnlyPermission = fieldContext.readOnly ? fieldContext.readOnly : false;

    const parentModelName = fieldLayoutInfo?.attrs?.parentModelName;
    const childModelName = fieldLayoutInfo?.attrs?.childModelName;
    const parentFieldName = fieldLayoutInfo?.attrs?.parentFieldName;
    const childFieldName = fieldLayoutInfo?.attrs?.childFieldName;
    const parentModuleName = fieldLayoutInfo?.attrs?.parentModuleName;
    const parentFieldLabels = fieldLayoutInfo?.attrs?.parentFieldLabels;
    const parentSearchFields = fieldLayoutInfo?.attrs?.parentSearchFields;

    const [formViewParams, setformViewParams] = useState<FormViewParams>()

    const viewMode: string = fieldContext.viewMode;

    useEffect(() => {
        const formviewparams: FormViewParams = {
            moduleName: parentModuleName,
            modelName: camelCase(parentModelName),
            id: "new",
            embeded: true,
            inlineCreateAutoSave: fieldLayoutInfo?.attrs?.inlineCreateAutoSave,
            layout: fieldLayoutInfo?.attrs?.inlineCreateLayout
        }
        setformViewParams(formviewparams);
    }, [])


    const [visibleCreateRelationEntity, setvisibleCreateRelationEntity] = useState(false);
    // auto complete specific code. 
    const entityApi = createSolidEntityApi(parentModelName || "userViewMetadata");
    const { useLazyGetSolidEntitiesQuery } = entityApi;
    const [triggerGetSolidEntities] = useLazyGetSolidEntitiesQuery();

    const fieldDisabled = fieldLayoutInfo.attrs?.disabled;
    const fieldReadonly = fieldLayoutInfo.attrs?.readonly;

    const formDisabled = solidFormViewMetaData.data.solidView?.layout?.attrs?.disabled;
    const formReadonly = solidFormViewMetaData.data.solidView?.layout?.attrs?.readonly;
    const whereClause = fieldLayoutInfo.attrs.whereClause;

    const [autoCompleteItems, setAutoCompleteItems] = useState<any[]>([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [currentQuery, setCurrentQuery] = useState("");
    const LIMIT = 50;
    const [loading, setLoading] = useState(false);
    const [viewDisplayValue, setViewDisplayValue] = useState<any>(null);


    useEffect(() => {
        const fn = async () => {
            if (fieldContext.data[fieldLayoutInfo.attrs.name]) {
                const queryData = {
                    offset: 0,
                    limit: LIMIT,
                    filters: {
                        $and: [
                            {
                                [parentFieldName]: {
                                    [fieldLayoutInfo?.attrs?.autocompleteMatchMode || '$eqi']: fieldContext.data[fieldLayoutInfo.attrs.name] ?? formik.values[fieldLayoutInfo.attrs.name]
                                }
                            }
                        ]
                    }
                };
                let autocompleteQs = qs.stringify(queryData, {
                    encodeValuesOnly: true,
                });
                const autocompleteResponse = await triggerGetSolidEntities(autocompleteQs);
                // TODO: if no data found then can we show no matching "entities", where entities can be replaced with the model plural name,
                const autocompleteData = autocompleteResponse.data;
                if (autocompleteData) {
                    const formattedRecords = autocompleteData.records.map((item: any) => {
                        const label = parentFieldLabels && parentFieldLabels.length > 0 ? parentFieldLabels.map((label: any) => item[label]).join(" - ") : item[parentFieldName];
                        return {
                            solidManyToOneLabel: label,
                            solidManyToOneValue: item[parentFieldName],
                            ...item,
                        }
                    });
                    if (formattedRecords.length > 0) {
                        formik.setFieldValue(fieldLayoutInfo.attrs.name, formattedRecords[0]);
                    }
                }
            }
        }
        fn()
    }, [])

    // Add this NEW useEffect - only for view mode refresh
    useEffect(() => {
        const fn = async () => {
            if (viewMode !== "view") {
                setViewDisplayValue(null);
                return;
            }

            const rawValue =
                fieldContext.data[fieldLayoutInfo.attrs.name] ??
                formik.values[fieldLayoutInfo.attrs.name];

            if (!rawValue) return;

            const searchValue =
                typeof rawValue === "object"
                    ? rawValue[parentFieldName]
                    : rawValue;

            const queryData = {
                offset: 0,
                limit: 1,
                filters: {
                    $and: [
                        {
                            [parentFieldName]: {
                                [fieldLayoutInfo?.attrs?.autocompleteMatchMode || "$eqi"]:
                                    searchValue,
                            },
                        },
                    ],
                },
            };

            const qsStr = qs.stringify(queryData, { encodeValuesOnly: true });
            const res = await triggerGetSolidEntities(qsStr);
            const record = res.data?.records?.[0];
            if (!record) return;

            const label =
                parentFieldLabels?.length > 0
                    ? parentFieldLabels.map((l: string) => record[l]).join(" - ")
                    : record[parentFieldName];
            console.log("Final View Label", label, record[parentFieldName])
            setViewDisplayValue({
                solidManyToOneLabel: label,
                solidManyToOneValue: record[parentFieldName],
                ...record,
            });
        };

        fn();
    }, [viewMode, formik.values[fieldLayoutInfo.attrs.name]]);


    const resolvedValue = viewMode === "view" ? viewDisplayValue : formik.values[fieldLayoutInfo.attrs.name];

    const autoCompleteSearch = async (event: AutoCompleteCompleteEvent) => {
        setOffset(0);
        setCurrentQuery(event.query || "");
        setHasMore(true);
        // Get the list view layout & metadata first. 
        const queryData = {
            offset: 0,
            limit: LIMIT,
            filters: {
                $and: [
                    ...(parentSearchFields?.length > 0
                        ? [
                            {
                                $or: parentSearchFields.map((field: any) => ({
                                    [field]: {
                                        [fieldLayoutInfo?.attrs?.autocompleteMatchMode || '$containsi']:
                                            event.query
                                    }
                                }))
                            }
                        ]
                        : [
                            {
                                [parentFieldName]: {
                                    [fieldLayoutInfo?.attrs?.autocompleteMatchMode || '$containsi']:
                                        event.query
                                }
                            }
                        ])

                ]
            }
        };
        let fixedFilterToBeApplied = false;
        let fixedFilterParsed = false;
        if (solidFormViewMetaData?.data?.solidView?.model?.singularName === "listOfValues" && fieldContext.fieldMetadata.relationCoModelSingularName !== "moduleMetadata") {
            fixedFilterToBeApplied = true;
        }
        if (fieldMetadata?.relationFieldFixedFilter || fieldLayoutInfo?.attrs?.whereClause) {
            const convertedFixedFilter = fieldLayoutInfo?.attrs?.whereClause ? fieldLayoutInfo?.attrs?.whereClause : fieldMetadata?.relationFieldFixedFilter;
            fixedFilterToBeApplied = true;
            const fixedFilterTemplate = Handlebars.compile(convertedFixedFilter);
            const renderedFilter = fixedFilterTemplate(formik.values);

            // Parse the result into a JS object
            let parsedFilter;
            try {
                parsedFilter = JSON.parse(renderedFilter);
                const isValid = (obj: any): boolean => {
                    if (!obj || typeof obj !== 'object') return false;

                    // Recursively check all nested values
                    const hasValidValue = (val: any): boolean => {
                        if (val === null || val === undefined || val === '') return false;
                        if (typeof val === 'object') {
                            return Object.values(val).some(hasValidValue);
                        }
                        return true;
                    };

                    return hasValidValue(obj);
                };

                if (isValid(parsedFilter)) {
                    queryData.filters.$and.push(parsedFilter);
                    fixedFilterParsed = true;
                } else {
                    console.warn(ERROR_MESSAGES.SKIPPING_EMPTY_FIXED_FILTER, parsedFilter);
                }
            } catch (e) {
                console.error(ERROR_MESSAGES.INVALID_JSON_WHERECLAUSE, renderedFilter);
                parsedFilter = {}; // fallback or throw error as needed
            }

        }

        let autocompleteQs = qs.stringify(queryData, {
            encodeValuesOnly: true,
        });
        // if (whereClause) {
        //     autocompleteQs = `${autocompleteQs}&${whereClause}`;
        // }


        if (fixedFilterToBeApplied && !fixedFilterParsed) {
            showToast(toast, "error", ERROR_MESSAGES.SELECT_RELEVANT_FIELD, ERROR_MESSAGES.FIELD_NOT_SELECT);

        } else {
            try {
                setLoading(true);
                // TODO: do error handling here, possible errors like modelname is incorrect etc...
                const autocompleteResponse = await triggerGetSolidEntities(autocompleteQs);

                // TODO: if no data found then can we show no matching "entities", where entities can be replaced with the model plural name,
                const autocompleteData = autocompleteResponse.data;

                if (autocompleteData) {
                    const autoCompleteItems = autocompleteData.records.map((item: any) => {
                        const label = parentFieldLabels && parentFieldLabels.length > 0 ? parentFieldLabels.map((label: any) => item[label]).join(" - ") : item[parentFieldName];
                        return {
                            solidManyToOneLabel: label,
                            solidManyToOneValue: item[parentFieldName],
                            ...item,
                        }
                    });
                    // const autoCompleteItems = autocompleteData.records.map((item: any) => {label: item[parentFieldName],value});

                    setAutoCompleteItems(autoCompleteItems);
                    setOffset(autocompleteData.records.length);
                    setHasMore(autocompleteData.records.length === LIMIT);
                }
            }
            finally {
                setLoading(false);
            }
        }
    }

    const onLazyLoad = async (event: { first: number; last: number }) => {
        if (!hasMore || loading) return;
        if (event.last < autoCompleteItems.length - 1) return; // Only load if user reaches bottom

        const queryData = {
            offset: offset,
            limit: LIMIT,
            filters: {
                $and: [
                    ...(parentSearchFields?.length > 0
                        ? [
                            {
                                $or: parentSearchFields.map((field: any) => ({
                                    [field]: {
                                        [fieldLayoutInfo?.attrs?.autocompleteMatchMode || '$containsi']:
                                            currentQuery
                                    }
                                }))
                            }
                        ]
                        : [
                            {
                                [parentFieldName]: {
                                    [fieldLayoutInfo?.attrs?.autocompleteMatchMode || '$containsi']:
                                        currentQuery
                                }
                            }
                        ])

                ]
            }
        };

        let fixedFilterToBeApplied = false;
        let fixedFilterParsed = false;
        if (solidFormViewMetaData?.data?.solidView?.model?.singularName === "listOfValues" && fieldContext.fieldMetadata.relationCoModelSingularName !== "moduleMetadata") {
            fixedFilterToBeApplied = true;
        }
        if (fieldMetadata?.relationFieldFixedFilter || fieldLayoutInfo?.attrs?.whereClause) {
            const convertedFixedFilter = fieldLayoutInfo?.attrs?.whereClause ? fieldLayoutInfo?.attrs?.whereClause : fieldMetadata?.relationFieldFixedFilter;
            fixedFilterToBeApplied = true;
            const fixedFilterTemplate = Handlebars.compile(convertedFixedFilter);
            const renderedFilter = fixedFilterTemplate(formik.values);

            // Parse the result into a JS object
            let parsedFilter;
            try {
                parsedFilter = JSON.parse(renderedFilter);
                const isValid = (obj: any): boolean => {
                    if (!obj || typeof obj !== 'object') return false;

                    // Recursively check all nested values
                    const hasValidValue = (val: any): boolean => {
                        if (val === null || val === undefined || val === '') return false;
                        if (typeof val === 'object') {
                            return Object.values(val).some(hasValidValue);
                        }
                        return true;
                    };

                    return hasValidValue(obj);
                };

                if (isValid(parsedFilter)) {
                    queryData.filters.$and.push(parsedFilter);
                    fixedFilterParsed = true;
                } else {
                    console.warn(ERROR_MESSAGES.SKIPPING_EMPTY_FIXED_FILTER, parsedFilter);
                }
            } catch (e) {
                console.error(ERROR_MESSAGES.INVALID_JSON_WHERECLAUSE, renderedFilter);
                parsedFilter = {}; // fallback or throw error as needed
            }

        }

        const autocompleteQs = qs.stringify(queryData, { encodeValuesOnly: true });
        if (fixedFilterToBeApplied && !fixedFilterParsed) {
            showToast(toast, "error", ERROR_MESSAGES.SELECT_RELEVANT_FIELD, ERROR_MESSAGES.FIELD_NOT_SELECT);

        } else {
            try {
                setLoading(true);
                const response = await triggerGetSolidEntities(autocompleteQs);
                const records = response.data?.records || [];
                if (records.length < LIMIT) setHasMore(false);
                setAutoCompleteItems((prev: any) => [...prev, ...records.map((item: any) => {
                    const label = parentFieldLabels && parentFieldLabels.length > 0 ? parentFieldLabels.map((label: any) => item[label]).join(" - ") : item[parentFieldName];
                    return {
                        solidManyToOneLabel: label,
                        solidManyToOneValue: item[parentFieldName],
                        ...item
                    }
                }
                )]);
                setOffset((prev: any) => prev + records.length);
            } finally {
                setLoading(false);
            }
        }
    };

    const isFormFieldValid = (formik: any, fieldName: string) => formik.touched[fieldName] && formik.errors[fieldName];

    const customCreateHandler = (values: any) => {
        const currentRelationData = formik.values[fieldLayoutInfo.attrs.name] || [];
        const jsonValues = Object.fromEntries(values.entries());
        console.log("jsonValues", jsonValues);
        const label = parentFieldLabels && parentFieldLabels.length > 0 ? parentFieldLabels.map((label: any) => jsonValues[label]).join(" - ") : jsonValues[parentFieldName];

        const updatedRelationData = [
            ...currentRelationData,
            // jsonValues[parentFieldName]
            {
                solidManyToOneLabel: label,
                solidManyToOneValue: "new",
                original: jsonValues,
            },
        ];

        formik.setFieldValue(fieldLayoutInfo.attrs.name, updatedRelationData);

    }
    return (
        <div className="relative" >
            <Toast ref={toast} />
            < div className="flex flex-column gap-2 mt-1 sm:mt-2 md:mt-3 lg:mt-4" >
                {showFieldLabel != false &&
                    <label htmlFor={fieldLayoutInfo.attrs.name} className="form-field-label" >
                        {fieldLabel}
                        {fieldMetadata.required && <span className="text-red-500" > * </span>}
                        <SolidFieldTooltip fieldContext={fieldContext} />
                    </label>
                }
                <div className="flex align-items-center gap-3" >
                    <AutoComplete
                        readOnly={formReadonly || fieldReadonly || readOnlyPermission}
                        disabled={formDisabled || fieldDisabled || readOnlyPermission || viewMode === "view"}
                        field="solidManyToOneLabel"
                        {...formik.getFieldProps(fieldLayoutInfo.attrs.name)}
                        id={fieldLayoutInfo.attrs.name}
                        value={resolvedValue || null}
                        dropdown={!readOnlyPermission}
                        suggestions={autoCompleteItems}
                        completeMethod={autoCompleteSearch}
                        onChange={(e) => fieldContext.onChange(e, 'onFieldChange')}
                        onFocus={(e) => e.target.select()}
                        className="w-full solid-standard-autocomplete"
                        // virtualScrollerOptions={{
                        //     itemSize: 38,
                        //     lazy: true,
                        //     onLazyLoad
                        // }}
                        virtualScrollerOptions={getVirtualScrollerOptions({
                            itemsLength: autoCompleteItems.length,
                            lazy: true,
                            onLazyLoad,
                        })}
                    />
                    {
                        fieldLayoutInfo.attrs.inlineCreate === "true" && readOnlyPermission === false && formViewParams && viewMode !== "view" &&
                        <RenderSolidFormEmbededView formik={formik} fieldContext={fieldContext} customCreateHandler={customCreateHandler} visibleCreateRelationEntity={visibleCreateRelationEntity} setvisibleCreateRelationEntity={setvisibleCreateRelationEntity} formViewParams={formViewParams} > </RenderSolidFormEmbededView>
                    }
                </div>
            </div>
            {
                isFormFieldValid(formik, fieldLayoutInfo.attrs.name) && (
                    <div className="absolute mt-1" >
                        <Message severity="error" text={formik?.errors[fieldLayoutInfo.attrs.name]?.toString()} />
                    </div>
                )
            }
        </div>
    );
}

