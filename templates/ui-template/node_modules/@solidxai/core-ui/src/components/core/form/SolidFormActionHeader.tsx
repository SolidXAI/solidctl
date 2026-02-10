import { BackButton } from "../../../components/common/BackButton";
import { SolidFormHeader } from "../../../components/common/SolidFormHeader";
import { useHandleFormCustomButtonClickaction } from "../../../components/common/useHandleFormCustomButtonClick";
import { permissionExpression } from "../../../helpers/permissions";
import { usePathname } from "../../../hooks/usePathname";
import { useRouter } from "../../../hooks/useRouter";
import { useSearchParams } from "../../../hooks/useSearchParams";
import { normalizeSolidFormActionPath } from "../../../helpers/routePaths";
import { Button } from "primereact/button";
import { OverlayPanel } from "primereact/overlaypanel";
import { useEffect, useRef, useState } from "react";
import { SolidFormViewNormalHeaderButton } from "./SolidFormViewNormalHeaderButton";
import { SolidFormViewContextMenuHeaderButton } from "./SolidFormViewContextMenuHeaderButton";
import { hasAnyRole } from "../../../helpers/rolesHelper";
import { useSession } from '../../../hooks/useSession'

export const SolidFormActionHeader = ({ formik, params, actionsAllowed, formViewLayout, solidView, solidFormViewMetaData, initialEntityData, setDeleteDialogVisible, setLayoutDialogVisible, setRedirectToList, viewMode, setViewMode, solidWorkflowFieldValue, setSolidWorkflowFieldValue, internationalisationEnabled, handleDraftPublishWorkFlow, publish, draftEnabled, onStepperUpdate,formData, isSubmitting }: any) => {
    const handleCustomButtonClick = useHandleFormCustomButtonClickaction();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const op = useRef(null);
    const [contextMenuHeaderButtons, setContextMenuHeaderButtons] = useState<any>([]);
    const [normalHeaderButtons, setNormalHeaderButtons] = useState<any>([]);
    const [isNavigating, setIsNavigating] = useState(false);
    const createHeaderTitle = `Create ${solidView.model.displayName}`;
    const editHeaderTitle = `Edit ${solidView.model.displayName}`;

    const { data: session, status } = useSession();
    const user = session?.user;

    const isPublished = publish && publish !== 'null';   // record is published if publish has value

    useEffect(() => {
        if (solidView) {
            let contextMenuHeaderButtonsData: any = [];
            let normalHeaderButtonsData: any = [];
            const formHeaderButtons = formViewLayout?.attrs?.formButtons;
            if (formHeaderButtons && formHeaderButtons.length > 0) {

                // Process normal header buttons
                contextMenuHeaderButtonsData = formHeaderButtons.filter((button: any) => {
                    const visibleToRole = button.attrs?.roles || [];
                    const defaultVisible = button.attrs?.visible;
                    if (defaultVisible === false) {
                        return false;
                    }
                    if (visibleToRole.length > 0) {
                        if (!hasAnyRole(user?.roles, visibleToRole)) {
                            return false;
                        }
                    }
                    return button.attrs && button.attrs.actionInContextMenu && button.attrs.actionInContextMenu === true;
                });
                setContextMenuHeaderButtons(contextMenuHeaderButtonsData)

                // Process normal header buttons
                normalHeaderButtonsData = formHeaderButtons.filter((button: any) => {
                    const visibleToRole = button.attrs?.roles || [];
                    if (visibleToRole.length > 0) {
                        if (!hasAnyRole(user?.roles, visibleToRole)) {
                            return false;
                        }
                    }

                    return !button.attrs || !button.attrs.actionInContextMenu || button.attrs.actionInContextMenu === false;
                });
                setNormalHeaderButtons(normalHeaderButtonsData);
            }
        }
    }, [formViewLayout]);

    const updateViewMode = (newMode: "view" | "edit") => {
        setViewMode(newMode);
        const queryParams = new URLSearchParams(searchParams.toString());
        queryParams.set("viewMode", newMode);
        const basePath = params?.id
            ? normalizeSolidFormActionPath(pathname, `form/${params.id}`)
            : pathname;
        router.push(`${basePath}?${queryParams.toString()}`);
        // const router = useRouter();
        // const pathname = usePathname();
        // const params = new URLSearchParams(searchParams?.toString() || "");
        // params.set("viewMode", newMode);
        // router.push(`${pathname}?${params.toString()}`, { scroll: false });

    };
    const FormActionDropdown = () => {
        const canPublish = actionsAllowed.includes(permissionExpression(params.modelName, 'publish'));
        const canUnpublish = actionsAllowed.includes(permissionExpression(params.modelName, 'unpublish'));

        return (
            <div>
                <div>
                    <Button
                        outlined
                        severity="secondary"
                        type="button"
                        icon={'pi pi-cog'}
                        size="small"
                        className="surface-card solid-icon-button hidden md:flex"
                        // style={{
                        //     height: 33.06,
                        //     width: 33.06
                        // }}
                        onClick={(e) =>
                            // @ts-ignore 
                            op.current.toggle(e)
                        }
                    />
                    <Button
                        outlined
                        type="button"
                        icon={'pi pi-cog'}
                        size="small"
                        className="surface-card solid-icon-button md:hidden"
                        // style={{
                        //     height: 33.06,
                        //     width: 33.06
                        // }}
                        onClick={(e) =>
                            // @ts-ignore 
                            op.current.toggle(e)
                        }
                    />
                </div>
                <OverlayPanel ref={op} className="solid-custom-overlay">
                    <div className="flex flex-column gap-1 p-1">
                        {params.embeded !== true &&
                            params.id !== "new" &&
                            actionsAllowed.includes(`${permissionExpression(params.modelName, 'delete')}`) &&
                            !isPublished &&
                            solidView?.layout?.attrs?.showDeleteFormButton !== false &&
                            !formViewLayout.attrs.readonly &&
                            <Button
                                text
                                type="button"
                                className="w-8rem text-left gap-2"
                                label="Delete"
                                size="small"
                                iconPos="left"
                                severity="danger"
                                icon={'pi pi-trash'}
                                onClick={() => setDeleteDialogVisible(true)}
                            />
                        }
                        <Button
                            text
                            type="button"
                            className="w-8rem text-left gap-2 purple-200"
                            label="Layout"
                            size="small"
                            iconPos="left"
                            severity="contrast"
                            icon={'pi pi-objects-column'}
                            onClick={() => setLayoutDialogVisible(true)}
                        />
                        {draftEnabled && params.id !== 'new' && (
                            <>
                                {!isPublished && canPublish && (
                                    <Button
                                        text
                                        type="button"
                                        className="w-8rem text-left gap-2 purple-200"
                                        label="Publish"
                                        size="small"
                                        iconPos="left"
                                        severity="contrast"
                                        icon="pi pi-cloud-upload"
                                        onClick={() => handleDraftPublishWorkFlow('publish')}
                                    />
                                )}

                                {isPublished && canUnpublish && (
                                    <Button
                                        text
                                        type="button"
                                        className="w-8rem text-left gap-2 purple-200"
                                        label="Unpublish"
                                        size="small"
                                        iconPos="left"
                                        severity="contrast"
                                        icon="pi pi-cloud-download"
                                        onClick={() => handleDraftPublishWorkFlow('unpublish')}
                                    />
                                )}
                            </>
                        )}


                        {contextMenuHeaderButtons.map((button: any, index: number) => {
                            return (
                                <SolidFormViewContextMenuHeaderButton
                                    key={button?.attrs?.action ?? index}
                                    button={button}
                                    params={params}
                                    formik={formik}
                                    formData={formData}
                                    solidFormViewMetaData={solidFormViewMetaData}
                                    handleCustomButtonClick={handleCustomButtonClick}
                                />

                            )
                        })
                        }
                        <div className="lg:hidden flex flex-column gap-1">
                            {normalHeaderButtons.map((button: any, index: number) => {
                                return (
                                    <SolidFormViewNormalHeaderButton
                                        key={button?.attrs?.action ?? index}
                                        button={button}
                                        params={params}
                                        formik={formik}
                                        formData={formData}
                                        solidFormViewMetaData={solidFormViewMetaData}
                                        handleCustomButtonClick={handleCustomButtonClick}
                                    />

                                )
                            })
                            }
                            {params.embeded !== true && params.draftEnabled &&
                                !formViewLayout.attrs.readonly && params.publish !== 'null' &&
                                formik.dirty &&
                                <div>
                                    <Button
                                        label="Draft"
                                        size="small"
                                        type="button"
                                    />
                                </div>
                            }
                        </div>
                    </div>
                </OverlayPanel>
            </div>
        )
    }
    return (
        <>
            <div className="solid-form-header">
                {params.id === "new" ? (
                    <>
                        <div className="flex align-items-center gap-3">
                            {params.embeded !== true && <BackButton />}
                            <div className="form-wrapper-title solid-text-wrapper"> {createHeaderTitle}</div>
                        </div>
                        <div className="flex solid-header-buttons-wrapper">
                            <div className="hidden lg:flex solid-header-buttons-wrapper">
                                {normalHeaderButtons.map((button: any, index: number) => {
                                    return (
                                        <SolidFormViewNormalHeaderButton
                                            key={index}
                                            button={button}
                                            params={params}
                                            formik={formik}
                                            formData={formData}
                                            solidFormViewMetaData={solidFormViewMetaData}
                                            handleCustomButtonClick={handleCustomButtonClick}
                                        />

                                    )
                                })
                                }
                            </div>
                            {params.embeded !== true &&
                                actionsAllowed.includes(`${permissionExpression(params.modelName, 'create')}`) &&
                                !formViewLayout.attrs.readonly &&
                                formik.dirty &&
                                <div>
                                    <Button
                                        label="Save"
                                        size="small"
                                        type="submit"
                                        className="hidden lg:flex"
                                        loading={isSubmitting}
                                        disabled={isSubmitting}
                                    />
                                    <Button
                                        size="small"
                                        type="submit"
                                        className="lg:hidden solid-icon-button"
                                        icon="pi pi-check"
                                        loading={isSubmitting}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            }
                            <div className="hidden lg:flex">
                                {params.embeded !== true && params.draftEnabled &&
                                    !formViewLayout.attrs.readonly && params.publish !== 'null' &&
                                    formik.dirty &&
                                    <div>
                                        <Button
                                            label="Draft"
                                            size="small"
                                            type="button"
                                        />
                                    </div>
                                }
                            </div>
                            {params.embeded == true &&
                                actionsAllowed.includes(`${permissionExpression(params.modelName, 'create')}`) &&
                                !formViewLayout.attrs.readonly &&
                                formik.dirty &&
                                <div>
                                    <Button
                                        label="Save"
                                        size="small"
                                        onClick={() => {
                                            setRedirectToList(params.redirectToPath ? true : false);
                                        }}
                                        type="submit"
                                        className="hidden lg:flex"
                                        loading={isSubmitting}
                                        disabled={isSubmitting}
                                    />
                                    <Button
                                        size="small"
                                        onClick={() => {
                                            setRedirectToList(params.redirectToPath ? true : false);
                                        }}
                                        type="submit"
                                        className="lg:hidden solid-icon-button"
                                        icon="pi pi-check"
                                        loading={isSubmitting}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            }
                            {params.embeded == true &&
                                <>
                                    <div className="hidden lg:flex">
                                        <div>
                                            <Button outlined size="small" type="button" label="Close" onClick={() => params.handlePopupClose()} className='bg-primary-reverse ' style={{ minWidth: 66 }} />
                                        </div>
                                    </div>
                                    <div className="lg:hidden">
                                        <Button outlined size="small" type="button" icon="pi pi-times" onClick={() => params.handlePopupClose()} className='bg-primary-reverse solid-icon-button' />
                                    </div>
                                </>
                            }
                            {/* {params.embeded !== true &&
                                <SolidCancelButton />
                            } */}
                            {
                                formViewLayout?.attrs?.showCogWheelFormButton !== false &&
                                actionsAllowed.includes(`${permissionExpression(params.modelName, 'update')}`) &&
                                actionsAllowed.includes(`${permissionExpression(params.modelName, 'create')}`) &&
                                <FormActionDropdown />
                            }
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex align-items-center gap-3">
                            {params.embeded !== true && <BackButton />}
                            <div className="form-wrapper-title solid-text-wrapper"> {viewMode === "edit" ? editHeaderTitle : solidView.model.displayName}</div>
                        </div>

                        <div className="flex solid-header-buttons-wrapper">
                            <div className="hidden lg:flex solid-header-buttons-wrapper">
                                {normalHeaderButtons.map((button: any, index: number) => {
                                    return (
                                        // <Button
                                        //     text
                                        //     type="button"
                                        //     className="w-full text-left gap-2"
                                        //     label={button.attrs.label}
                                        //     size="small"
                                        //     iconPos="left"
                                        //     severity="contrast"
                                        //     icon={button?.attrs?.className ? button?.attrs?.className : "pi pi-pencil"}
                                        //     onClick={() => {
                                        //         const event = {
                                        //             action: button.attrs.action,
                                        //             params,
                                        //             formik,
                                        //             solidFormViewMetaData: solidFormViewMetaData.data
                                        //         }
                                        //         handleCustomButtonClick(button.attrs, event)
                                        //     }}
                                        // />
                                        <SolidFormViewNormalHeaderButton
                                            key={index}
                                            button={button}
                                            params={params}
                                            formik={formik}
                                            formData={formData}
                                            solidFormViewMetaData={solidFormViewMetaData}
                                            handleCustomButtonClick={handleCustomButtonClick}
                                        />
                                    )
                                })
                                }
                            </div>
                            {
                                !formViewLayout.attrs.readonly &&
                                formViewLayout.attrs?.showAddFormButton !== false &&
                                params.embeded !== true &&
                                viewMode === "view" &&
                                actionsAllowed.includes(`${permissionExpression(params.modelName, 'create')}`) &&
                                <>
                                    <div className="hidden lg:flex">
                                    <div>
                                        <Button type="button" label="Add" size='small' onClick={() => {
                                            setIsNavigating(true);
                                            router.replace(`${normalizeSolidFormActionPath(pathname, "form")}/new?viewMode=edit`);
                                        }} loading={isNavigating} disabled={isNavigating} />
                                    </div>
                                    </div>
                                    <div className="lg:hidden">
                                        <Button type="button" icon="pi pi-plus" size='small' onClick={() => {
                                            setIsNavigating(true);
                                            router.replace(`${normalizeSolidFormActionPath(pathname, "form")}/new?viewMode=edit`);
                                        }} className="p-button-sm solid-icon-button" loading={isNavigating} disabled={isNavigating} />
                                    </div>
                                </>
                            }
                            {
                                !formViewLayout.attrs.readonly &&
                                formViewLayout.attrs?.showEditFormButton !== false &&
                                params.embeded !== true &&
                                viewMode === "view" &&
                                !isPublished &&
                                actionsAllowed.includes(`${permissionExpression(params.modelName, 'update')}`) &&
                                <>
                                    <div className="hidden lg:flex">
                                        <div>
                                            <Button label="Edit" size="small" onClick={() => updateViewMode("edit")} type="button" />
                                        </div>
                                    </div>
                                    <div className="lg:hidden">
                                        <Button icon="pi pi-pencil" size="small" onClick={() => updateViewMode("edit")} type="button" className="p-button-sm solid-icon-button " />
                                    </div>
                                </>
                            }

                            {
                                params.embeded !== true &&
                                actionsAllowed.includes(`${permissionExpression(params.modelName, 'update')}`) &&
                                !formViewLayout.attrs.readonly &&
                                formik.dirty &&

                                <div>
                                    <Button label="Save" size="small" type="submit"  className="hidden lg:flex" loading={isSubmitting} disabled={isSubmitting}/>
                                    <Button  size="small" type="submit" className="lg:hidden solid-icon-button" icon="pi pi-check" loading={isSubmitting} disabled={isSubmitting}/>
                                </div>
                            }

                            {/* Inline */}
                            {
                                params.embeded == true &&
                                actionsAllowed.includes(`${permissionExpression(params.modelName, 'update')}`) &&
                                !formViewLayout.attrs.readonly &&
                                formik.dirty &&

                                <div>
                                    <Button label="Save" size="small" type="submit" className="hidden lg:flex" />
                                    <Button size="small" type="submit" className="lg:hidden solid-icon-button" icon="pi pi-check" />

                                </div>
                            }
                            {
                                params.embeded == true &&
                                actionsAllowed.includes(`${permissionExpression(params.modelName, 'delete')}`) &&
                                formViewLayout.attrs?.showDeleteFormButton !== false &&
                                !formViewLayout.attrs.readonly &&
                                !isPublished &&
                                <div>
                                    <Button size="small" type="button" label="Delete" severity="danger" onClick={() => setDeleteDialogVisible(true)} />
                                </div>
                            }
                            {
                                params.embeded == true &&
                                <>
                                    <div className="hidden lg:flex">
                                        <div>
                                            <Button outlined size="small" type="button" label="Close" onClick={() => params.handlePopupClose()} className='bg-primary-reverse ' style={{ minWidth: 66 }} />
                                        </div>
                                    </div>
                                    <div className="lg:hidden">
                                        <Button outlined size="small" type="button" icon="pi pi-times" onClick={() => params.handlePopupClose()} className='bg-primary-reverse solid-icon-button' />
                                    </div>
                                </>
                            }
                            {/* {
                                params.embeded !== true &&

                                <SolidCancelButton />
                            } */}
                            {
                                formViewLayout?.attrs?.showCogWheelFormButton !== false &&
                                actionsAllowed.includes(`${permissionExpression(params.modelName, 'update')}`) &&
                                actionsAllowed.includes(`${permissionExpression(params.modelName, 'create')}`) &&

                                <FormActionDropdown />
                            }
                        </div>
                    </>
                )}
            </div>
            {params.embeded !== true &&
                <SolidFormHeader
                    solidFormViewMetaData={solidFormViewMetaData}
                    initialEntityData={initialEntityData}
                    modelName={params.modelName}
                    id={params.id}
                    solidWorkflowFieldValue={solidWorkflowFieldValue}
                    setSolidWorkflowFieldValue={setSolidWorkflowFieldValue}
                    onStepperUpdate={onStepperUpdate}
                />
            }
        </>
    )
}
