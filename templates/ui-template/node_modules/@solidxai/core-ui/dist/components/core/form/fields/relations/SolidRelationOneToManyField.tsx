
import { SolidListView } from "../../../../../components/core/list/SolidListView";
import { camelCase, capitalize } from "lodash";
import { Dialog } from "primereact/dialog";
import { useEffect, useState } from "react";
import * as Yup from 'yup';
import SolidFormView from '../../../../../components/core/form/SolidFormView';
import { FormikObject, ISolidField, SolidFieldProps } from "../ISolidField";
import { usePathname } from "../../../../../hooks/usePathname";
import { useRouter } from "../../../../../hooks/useRouter";
import { getExtensionComponent } from "../../../../../helpers/registry";
import { SolidFormFieldWidgetProps, SolidFormWidgetProps } from "../../../../../types/solid-core";
import { Message } from "primereact/message";
import FieldMetaData from "../../../../../components/core/model/FieldMetaData";
import { Chip } from "primereact/chip";
import { SolidFieldTooltip } from "../../../../../components/common/SolidFieldTooltip";
import { Divider } from "primereact/divider";
import { Button } from "primereact/button";
import { ERROR_MESSAGES } from "../../../../../constants/error-messages";

export type FormViewParams = {
    moduleName: any;
    id: any;
    embeded: any;
    isCustomCreate: any;
    customLayout: any;
    modelName: any;
    parentFieldName?: any;
    parentData: any;
    onEmbeddedFormSave: any;
    inlineCreateAutoSave: any;
    customCreateHandler?: any;
    handlePopupClose?: any
}

export class SolidRelationOneToManyField implements ISolidField {

    private fieldContext: SolidFieldProps;
    constructor(fieldContext: SolidFieldProps) {
        this.fieldContext = fieldContext;
    }

    initialValue(): any {

        // const manyToOneFieldData = this.fieldContext.data[this.fieldContext.field.attrs.name];
        // const fieldMetadata = this.fieldContext.fieldMetadata;
        // const userKeyField = fieldMetadata.relationModel.userKeyField.name;
        // const manyToOneColVal = manyToOneFieldData ? manyToOneFieldData[userKeyField] : '';

        // return { label: manyToOneColVal || '', value: manyToOneFieldData?.id || '' };

        return '';
    }

    updateFormData(value: any, formData: FormData): any {
        const fieldLayoutInfo = this.fieldContext.field;
        // if(!value || value.length === 0) {
        //     formData.append(`${fieldLayoutInfo.attrs.name}Command`, "clear");

        // }
        if (value) {
            formData.append(`${fieldLayoutInfo.attrs.name}Id`, value.value);
        }
    }

    validationSchema(): Yup.Schema {
        let schema = Yup.object();

        const fieldMetadata = this.fieldContext.fieldMetadata;
        const fieldLayoutInfo = this.fieldContext.field;
        const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;

        // 1. required 
        if (fieldMetadata.required) {
            schema = schema.required(ERROR_MESSAGES.FIELD_REUQIRED(fieldLabel));
        }
        return schema;
    }

    render(formik: FormikObject) {
        const fieldMetadata = this.fieldContext.fieldMetadata;

        const fieldLayoutInfo = this.fieldContext.field;
        const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
        const className = fieldLayoutInfo.attrs?.className || 'field col-12';

        const userKeyFieldName = fieldMetadata.relationModel?.userKeyField?.name;

        let DynamicWidget = getExtensionComponent("SolidFormFieldRelationViewModeWidget");
        const widgetProps = {
            label: fieldLabel,
            value: (this.fieldContext.data?.[fieldLayoutInfo.attrs.name] || []).map(
                (item: any) => ({ label: item[userKeyFieldName] ?? '' })
            ),
            layout: fieldLayoutInfo
        }

        // DefaultRelationOneToManyFormEditWidget


        let viewWidget = fieldLayoutInfo.attrs.viewWidget;
        let editWidget = fieldLayoutInfo.attrs.editWidget;
        if (!editWidget) {
            editWidget = 'DefaultRelationOneToManyFormEditWidget';
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


export const DefaultRelationOneToManyFormEditWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const router = useRouter();

    const fieldLayoutInfo = fieldContext.field;
    const className = fieldLayoutInfo.attrs?.className || 'field col-12';
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const fieldDescription = fieldLayoutInfo.attrs.description ?? fieldMetadata.description;
    const solidFormViewMetaData = fieldContext.solidFormViewMetaData;
    const [visibleCreateRelationEntity, setvisibleCreateRelationEntity] = useState(false);
    const [listViewParams, setListViewParams] = useState<any>()
    const [formViewParams, setformViewParams] = useState<FormViewParams>()
    const [refreshList, setRefreshList] = useState(false); // Added state for rerender
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;
    const readOnlyPermission = fieldContext.readOnly;
    const pathname = usePathname();
    const lastPathSegment = pathname.split('/').pop();
    const userKeyField: any = Object.entries(fieldContext.solidFormViewMetaData.data.solidFieldsMetadata).find(([_, value]: any) => value.isUserKey)?.[0];
    const [showSaveParentEntityConfirmationPopup, setShowSaveParentEntityConfirmationPopup] = useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const childEntity = urlParams.get('childEntity');
        if (childEntity === fieldLayoutInfo.attrs.name && lastPathSegment !== "new") {
            handlePopupOpen('new');
        }
    }, [])

    const handlePopupOpen = (id: any) => {
        if (lastPathSegment === "new") {
            setShowSaveParentEntityConfirmationPopup(true);
        } else {

            const formviewparams: FormViewParams = {
                moduleName: fieldContext.fieldMetadata.relationModelModuleName,
                id: id,
                embeded: true,
                isCustomCreate: false,
                customLayout: fieldLayoutInfo?.attrs?.inlineCreateLayout,
                modelName: camelCase(fieldContext.fieldMetadata.relationCoModelSingularName),
                parentFieldName: fieldContext.fieldMetadata.relationCoModelFieldName,
                parentData: userKeyField ? { [userKeyField]: { solidManyToOneLabel: fieldContext.data[userKeyField], solidManyToOneValue: fieldContext.data['id'] } } : {},
                onEmbeddedFormSave: fieldContext.onEmbeddedFormSave,
                inlineCreateAutoSave: fieldLayoutInfo?.attrs?.inlineCreateAutoSave,
            }
            setformViewParams(formviewparams);
            setvisibleCreateRelationEntity(true);
        }
    }

    const handlePopupClose = () => {
        setvisibleCreateRelationEntity(false);
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('childEntity');
        router.push(currentUrl.toString());
        setRefreshList((prev) => !prev);
        const customFilter = fieldContext.fieldMetadata.relationCoModelFieldName ? fieldContext.fieldMetadata.relationCoModelFieldName : `${fieldContext.modelName}`
        const lisviewparams = {
            moduleName: fieldContext.fieldMetadata.relationModelModuleName,
            modelName: camelCase(fieldContext.fieldMetadata.relationCoModelSingularName),
            inlineCreate: readOnlyPermission === false ? true : false,
            customLayout: fieldLayoutInfo?.attrs?.inlineListLayout,
            embeded: true,
            id: fieldContext.data ? fieldContext?.data?.id : 'new',
            customFilter: {
                [customFilter]: {
                    id: {
                        $eq: fieldContext.data && fieldContext.data.id !== undefined ? fieldContext.data.id : -1
                    }
                }
            }
        }
        setListViewParams(lisviewparams)
    }


    //Intial Params 
    useEffect(() => {

        const customFilter = fieldContext.fieldMetadata.relationCoModelFieldName ? fieldContext.fieldMetadata.relationCoModelFieldName : `${fieldContext.modelName}`
        const listviewparams = {
            moduleName: fieldContext.fieldMetadata.relationModelModuleName,
            modelName: camelCase(fieldContext.fieldMetadata.relationCoModelSingularName),
            inlineCreate: readOnlyPermission === false ? true : false,
            customLayout: fieldLayoutInfo?.attrs?.inlineListLayout,
            embeded: true,
            id: fieldContext.data ? fieldContext?.data?.id : 'new',
            customFilter: {
                [customFilter]: {
                    id: {
                        $eq: fieldContext.data && fieldContext.data.id !== undefined ? fieldContext.data.id : -1
                    }
                }
            }
        }
        setListViewParams(listviewparams);
        const formviewparams: FormViewParams = {
            moduleName: fieldContext.fieldMetadata.relationModelModuleName,
            modelName: camelCase(fieldContext.fieldMetadata.relationCoModelSingularName),
            parentFieldName: fieldContext.fieldMetadata.relationCoModelFieldName,
            id: "new",
            embeded: true,
            isCustomCreate: false,
            customLayout: fieldLayoutInfo?.attrs?.inlineCreateLayout,
            parentData: userKeyField ? { [userKeyField]: { solidManyToOneLabel: fieldContext.data[userKeyField], solidManyToOneValue: fieldContext.data['id'] } } : {},
            onEmbeddedFormSave: fieldContext.onEmbeddedFormSave,
            inlineCreateAutoSave: fieldLayoutInfo?.attrs?.inlineCreateAutoSave,
        }



        setformViewParams(formviewparams)

    }, [readOnlyPermission])

    const fieldDisabled = fieldLayoutInfo.attrs?.disabled;
    const fieldReadonly = fieldLayoutInfo.attrs?.readonly;

    const formDisabled = solidFormViewMetaData.data.solidView?.layout?.attrs?.disabled;
    const formReadonly = solidFormViewMetaData.data.solidView?.layout?.attrs?.readonly;
    const isFormFieldValid = (formik: any, fieldName: string) => formik.touched[fieldName] && formik.errors[fieldName];

    const saveParentEntity = async () => {
        const currentPath = window.location.pathname;
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('childEntity', fieldLayoutInfo.attrs.name);
        currentUrl.searchParams.set('viewMode', 'edit');
        const updatedPath = currentUrl.toString();
        try {
            console.log("updatedPath", updatedPath);
            router.push(updatedPath);
            await formik.handleSubmit();
        } catch {

        }
        setShowSaveParentEntityConfirmationPopup(false);
    };



    return (
        <div>
            {/* <div className="justify-content-center align-items-center"> */}
            {showFieldLabel != false &&
                <label htmlFor={fieldLayoutInfo.attrs.name} className="form-field-label">{fieldLabel}
                    {fieldMetadata.required && <span className="text-red-500"> *</span>}
                    <SolidFieldTooltip fieldContext={fieldContext} />
                </label>
            }

            {/* {lastPathSegment === 'new' && <p>Please save the {solidFormViewMetaData.data.solidView.model.displayName} to be able to save {fieldMetadata.displayName}</p>} */}
            {listViewParams &&
                <SolidListView key={refreshList.toString()}  {...listViewParams} handlePopUpOpen={handlePopupOpen} />
            }
            {readOnlyPermission !== true && formViewParams &&
                <RenderSolidFormEmbededView formik={formik} fieldContext={fieldContext} visibleCreateRelationEntity={visibleCreateRelationEntity} setvisibleCreateRelationEntity={setvisibleCreateRelationEntity} formViewParams={formViewParams} handlePopupClose={handlePopupClose}></RenderSolidFormEmbededView>
            }

            <Dialog showHeader={false} headerClassName="py-2" contentClassName="px-0 pb-0" className="solid-confirm-dialog" contentStyle={{ borderRadius: 6 }} visible={showSaveParentEntityConfirmationPopup} style={{ width: '20vw' }} onHide={() => { if (!showSaveParentEntityConfirmationPopup) return; setShowSaveParentEntityConfirmationPopup(false); }}>
                <div className="p-4">
                    <p className="m-0 solid-primary-title" style={{ fontSize: 16 }}>
                        Before Creating {fieldLabel} you need to save {solidFormViewMetaData?.data?.solidView?.model?.displayName ? solidFormViewMetaData?.data?.solidView?.model?.displayName : capitalize(fieldContext.modelName)}.
                        Please click save if you wish to proceed ?
                    </p>
                    <div className="flex align-items-center justify-content-start gap-2 mt-3">
                        <Button label="Save" size="small" onClick={saveParentEntity} />
                        <Button label="Cancel" size="small" onClick={() => setShowSaveParentEntityConfirmationPopup(false)} outlined className='bg-primary-reverse' />
                    </div>
                </div>
            </Dialog>

        </div>
    );
}


export const DefaultRelationOneToManyFormViewWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const fieldMetadata = fieldContext.fieldMetadata;

    const fieldLayoutInfo = fieldContext.field;
    const className = fieldLayoutInfo.attrs?.className || 'field col-12';
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const fieldDescription = fieldLayoutInfo.attrs.description ?? fieldMetadata.description;
    const solidFormViewMetaData = fieldContext.solidFormViewMetaData;
    const [visibleCreateRelationEntity, setvisibleCreateRelationEntity] = useState(false);
    const [listViewParams, setListViewParams] = useState<any>()
    const [formViewParams, setformViewParams] = useState<FormViewParams>()
    const [refreshList, setRefreshList] = useState(false); // Added state for rerender
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;
    const readOnlyPermission = fieldContext.readOnly;
    const pathname = usePathname();
    const lastPathSegment = pathname.split('/').pop();
    const userKeyField: any = Object.entries(fieldContext.solidFormViewMetaData.data.solidFieldsMetadata).find(([_, value]: any) => value.isUserKey)?.[0];

    const handlePopupOpen = (id: any) => {

        const formviewparams: FormViewParams = {
            moduleName: fieldContext.fieldMetadata.relationModelModuleName,
            id: id,
            embeded: true,
            isCustomCreate: false,
            customLayout: fieldLayoutInfo?.attrs?.inlineCreateLayout,
            modelName: camelCase(fieldContext.fieldMetadata.relationCoModelSingularName),
            parentFieldName: fieldContext.fieldMetadata.relationCoModelFieldName,
            parentData: userKeyField ? { [userKeyField]: { solidManyToOneLabel: fieldContext.data[userKeyField], solidManyToOneValue: fieldContext.data['id'] } } : {},
            onEmbeddedFormSave: fieldContext.onEmbeddedFormSave,
            inlineCreateAutoSave: fieldLayoutInfo?.attrs?.inlineCreateAutoSave,

        }
        setformViewParams(formviewparams);
        setvisibleCreateRelationEntity(true);


    }

    const handlePopupClose = () => {
        setvisibleCreateRelationEntity(false);
        setRefreshList((prev) => !prev);
        const customFilter = fieldContext.fieldMetadata.relationCoModelFieldName ? fieldContext.fieldMetadata.relationCoModelFieldName : `${fieldContext.modelName}`
        const lisviewparams = {
            moduleName: fieldContext.fieldMetadata.relationModelModuleName,
            modelName: camelCase(fieldContext.fieldMetadata.relationCoModelSingularName),
            inlineCreate: readOnlyPermission === false ? true : false,
            customLayout: fieldLayoutInfo?.attrs?.inlineListLayout,
            embeded: true,
            id: fieldContext.data ? fieldContext?.data?.id : 'new',
            customFilter: {
                [customFilter]: {
                    id: {
                        $eq: fieldContext.data ? fieldContext?.data?.id : -1
                    }
                }
            }
        }
        setListViewParams(lisviewparams)
    }
    //Intial Params 
    useEffect(() => {

        const customFilter = fieldContext.fieldMetadata.relationCoModelFieldName ? fieldContext.fieldMetadata.relationCoModelFieldName : `${fieldContext.modelName}`
        const listviewparams = {
            moduleName: fieldContext.fieldMetadata.relationModelModuleName,
            modelName: camelCase(fieldContext.fieldMetadata.relationCoModelSingularName),
            inlineCreate: readOnlyPermission === false ? true : false,
            customLayout: fieldLayoutInfo?.attrs?.inlineListLayout,
            embeded: true,
            id: fieldContext.data ? fieldContext?.data?.id : 'new',
            customFilter: {
                [customFilter]: {
                    id: {
                        $eq: fieldContext?.data?.id !== undefined ? fieldContext?.data?.id : -1
                    }
                }
            }
        }
        setListViewParams(listviewparams);
        const formviewparams: FormViewParams = {
            moduleName: fieldContext.fieldMetadata.relationModelModuleName,
            id: "new",
            embeded: true,
            inlineCreateAutoSave: fieldLayoutInfo?.attrs?.inlineCreateAutoSave,
            customLayout: fieldLayoutInfo?.attrs?.inlineCreateLayout,
            modelName: camelCase(fieldContext.fieldMetadata.relationCoModelSingularName),
            parentFieldName: fieldContext.fieldMetadata.relationCoModelFieldName,
            parentData: userKeyField ? { [userKeyField]: { solidManyToOneLabel: fieldContext.data[userKeyField], solidManyToOneValue: fieldContext.data['id'] } } : {},
            onEmbeddedFormSave: fieldContext.onEmbeddedFormSave,
            isCustomCreate: false

        }
        setformViewParams(formviewparams)

    }, [readOnlyPermission])

    const fieldDisabled = fieldLayoutInfo.attrs?.disabled;
    const fieldReadonly = fieldLayoutInfo.attrs?.readonly;

    const formDisabled = solidFormViewMetaData.data.solidView?.layout?.attrs?.disabled;
    const formReadonly = solidFormViewMetaData.data.solidView?.layout?.attrs?.readonly;


    return (
        <div>
            {/* <div className="justify-content-center align-items-center"> */}
            {showFieldLabel != false &&
                <label htmlFor={fieldLayoutInfo.attrs.name} className="form-field-label">{fieldLabel}
                    {fieldMetadata.required && <span className="text-red-500"> *</span>}
                    <SolidFieldTooltip fieldContext={fieldContext} />
                </label>
            }

            {/* {lastPathSegment === 'new' && <p>Please save the {solidFormViewMetaData.data.solidView.model.displayName} to be able to save {fieldMetadata.displayName}</p>} */}
            {listViewParams &&
                <SolidListView key={refreshList.toString()}  {...listViewParams} handlePopUpOpen={handlePopupOpen} />
            }
            {readOnlyPermission !== true && formViewParams &&
                <RenderSolidFormEmbededView fieldLayoutInfo={fieldLayoutInfo} visibleCreateRelationEntity={visibleCreateRelationEntity} setvisibleCreateRelationEntity={setvisibleCreateRelationEntity} formViewParams={formViewParams} handlePopupClose={handlePopupClose}></RenderSolidFormEmbededView>
            }


        </div>
    );
}


export const RenderSolidFormEmbededView = ({ fieldLayoutInfo, customCreateHandler, visibleCreateRelationEntity, setvisibleCreateRelationEntity, formViewParams, handlePopupClose }: any) => {
    const router = useRouter();

    const params: FormViewParams = {
        moduleName: formViewParams.moduleName,
        id: formViewParams?.id,
        modelName: camelCase(formViewParams.modelName),
        embeded: formViewParams.embeded,
        customLayout: formViewParams.customLayout,
        customCreateHandler: ((values: any) => {
            setvisibleCreateRelationEntity(false);
            customCreateHandler(values)
        }),
        inlineCreateAutoSave: formViewParams.inlineCreateAutoSave,
        handlePopupClose: handlePopupClose,
        parentFieldName: formViewParams.parentFieldName,
        parentData: formViewParams.parentData,
        onEmbeddedFormSave: formViewParams.onEmbeddedFormSave,
        isCustomCreate: formViewParams.isCustomCreate
    }

    return (
        <div className="many-to-many-add" >
            {/* <Button icon="pi pi-plus"
                rounded
                outlined
                aria-label="Filter"
                type="button"
                onClick={() => setvisibleCreateRelationEntity(true)}
            /> */}
            <Dialog
                header=""
                showHeader={false}
                visible={visibleCreateRelationEntity}
                className="solid-dialog"
                style={{
                    width: fieldLayoutInfo?.attrs?.inlineCreateLayout?.attrs?.width ?? "60vw",
                    height: fieldLayoutInfo?.attrs?.inlineCreateLayout?.attrs?.height ?? "auto"
                }}
                onHide={() => {
                    if (!visibleCreateRelationEntity) return;
                    setvisibleCreateRelationEntity(false);
                }}
                breakpoints={{ '1199px': '35rem', "767px": '85vw', "550px": '90vw' }}

            >
                {params &&
                    <SolidFormView {...params} />
                }
            </Dialog>
        </div>
    )
}


export const PseudoRelationOneToManyFormWidget = ({ formData, field, fieldsMetadata, viewMetadata, formViewData }: SolidFormWidgetProps) => {

    const fieldLayoutInfo = field;
    const className = fieldLayoutInfo.attrs?.className || 'field col-12';
    const fieldLabel = fieldLayoutInfo.attrs.label;
    const fieldDescription = fieldLayoutInfo.attrs.description;
    const [visibleCreateRelationEntity, setvisibleCreateRelationEntity] = useState(false);
    const [listViewParams, setListViewParams] = useState<any>()
    const [formViewParams, setformViewParams] = useState<FormViewParams | null>(null)
    const [refreshList, setRefreshList] = useState(false); // Added state for rerender
    const showFieldLabel = fieldLayoutInfo?.attrs?.showLabel;
    const readOnlyPermission = fieldLayoutInfo.readOnly ? fieldLayoutInfo.readOnly : false;
    const pathname = usePathname();

    const parentModelName = fieldLayoutInfo?.attrs?.parentModelName;
    const childModelName = fieldLayoutInfo?.attrs?.childModelName;
    const parentFieldName = fieldLayoutInfo?.attrs?.parentFieldName;
    const childFieldName = fieldLayoutInfo?.attrs?.childFieldName;
    const parentModuleName = fieldLayoutInfo?.attrs?.parentModuleName;
    const childModuleName = fieldLayoutInfo?.attrs?.childModuleName


    const handlePopupOpen = (id: any) => {

        const formviewparams: FormViewParams = {
            moduleName: childModuleName,
            modelName: camelCase(childModelName),
            id: id,
            embeded: true,
            isCustomCreate: false,
            inlineCreateAutoSave: fieldLayoutInfo?.attrs?.inlineCreateAutoSave,
            customLayout: fieldLayoutInfo?.attrs?.inlineCreateLayout,
            parentFieldName: parentFieldName,
            parentData: childFieldName && formViewData?.data && formViewData?.data[parentFieldName] ? { [childFieldName]: formViewData.data[parentFieldName] } : {},
            onEmbeddedFormSave: fieldLayoutInfo.onEmbeddedFormSave ? fieldLayoutInfo : false
        }
        setformViewParams(formviewparams);
        setvisibleCreateRelationEntity(true);


    }

    const handlePopupClose = () => {
        setvisibleCreateRelationEntity(false);
        setRefreshList((prev) => !prev);
        const customFilter = childModelName
        const lisviewparams = {
            moduleName: childModuleName,
            modelName: camelCase(childModelName),
            inlineCreate: readOnlyPermission === false ? true : false,
            customLayout: fieldLayoutInfo?.attrs?.inlineListLayout,
            embeded: true,
            id: formViewData && formViewData?.data ? formViewData?.data?.id : 'new',
            customFilter: childFieldName && formViewData?.data
                ? {
                    [childFieldName]: {
                        $eq: formViewData.data[parentFieldName]
                    }
                }
                : {
                    id: {
                        $eq: -1
                    }
                }
        }
        setListViewParams(lisviewparams)
    }
    //Intial Params 
    useEffect(() => {
        const customFilter = childModelName
        const listviewparams = {
            moduleName: childModuleName,
            modelName: camelCase(childModelName),
            inlineCreate: readOnlyPermission === false ? true : false,
            customLayout: fieldLayoutInfo?.attrs?.inlineListLayout,
            embeded: true,
            id: formViewData && formViewData?.data ? formViewData?.data?.id : 'new',
            customFilter: childFieldName && formViewData?.data
                ? {
                    [childFieldName]: {
                        $eq: formViewData.data[parentFieldName]
                    }
                }
                : {
                    id: {
                        $eq: -1
                    }
                }
        }

        setListViewParams(listviewparams);
        const formviewparams: FormViewParams = {
            moduleName: childModuleName,
            modelName: camelCase(childModelName),
            id: "new",
            embeded: true,
            isCustomCreate: false,
            inlineCreateAutoSave: fieldLayoutInfo?.attrs?.inlineCreateAutoSave,
            customLayout: fieldLayoutInfo?.attrs?.inlineCreateLayout,
            parentFieldName: parentFieldName,
            parentData: childFieldName && formViewData && formViewData?.data && formViewData?.data[parentFieldName] ? { [childFieldName]: formViewData.data[parentFieldName] } : {},
            onEmbeddedFormSave: formViewData && formViewData.onEmbeddedFormSave

        }

        setformViewParams(formviewparams)


    }, [readOnlyPermission, formViewData])

    return (
        <div>
            {/* <div className="justify-content-center align-items-center"> */}
            {showFieldLabel != false &&
                <label htmlFor={fieldLayoutInfo.attrs.name} className="form-field-label">{fieldLabel}
                    {/* {fieldMetadata.required && <span className="text-red-500"> *</span>} */}
                    {/* <SolidFieldTooltip fieldContext={fieldContext} /> */}
                </label>
            }

            {/* {lastPathSegment === 'new' && <p>Please save the {solidFormViewMetaData.data.solidView.model.displayName} to be able to save {fieldMetadata.displayName}</p>} */}
            {listViewParams &&
                <SolidListView key={refreshList.toString()}  {...listViewParams} handlePopUpOpen={handlePopupOpen} />
            }
            {readOnlyPermission !== true && formViewParams &&
                <RenderSolidFormEmbededView fieldLayoutInfo={fieldLayoutInfo} visibleCreateRelationEntity={visibleCreateRelationEntity} setvisibleCreateRelationEntity={setvisibleCreateRelationEntity} formViewParams={formViewParams} handlePopupClose={handlePopupClose}></RenderSolidFormEmbededView>
            }

        </div>
    );
}
