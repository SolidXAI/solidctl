import { useSession } from "../../../hooks/useSession";
import { permissionExpression } from "../../../helpers/permissions";
import Image from "../../common/Image";
import { usePathname } from "../../../hooks/usePathname";
import { useRouter } from "../../../hooks/useRouter";
import { Accordion, AccordionTab } from "primereact/accordion";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Divider } from "primereact/divider";
import { OverlayPanel } from "primereact/overlaypanel";
import { RadioButton } from "primereact/radiobutton";
import { useEffect, useRef, useState } from "react";
import { SolidListColumnSelector } from "./SolidColumnSelector/SolidListColumnSelector";
import { SolidExport } from "../../../components/common/SolidExport";
import { Dialog } from "primereact/dialog";
import { useHandleListCustomButtonClick } from "../../../components/common/useHandleListCustomButtonClick";
import { SolidListViewHeaderContextMenuButton } from "./SolidListViewHeaderContextMenuButton";
import "../../common/solid-export.css";
import { SolidGenericImport } from "../common/SolidGenericImport/SolidGenericImport";
import { hasAnyRole } from "../../../helpers/rolesHelper";
import { SolidListViewHeaderButton } from "./SolidListViewHeaderButton";

export const SolidListViewConfigure = (
    { listViewMetaData,
        solidListViewLayout,
        setShowArchived,
        showArchived,
        viewData,
        sizeOptions,
        setSize,
        size,
        viewModes,
        params,
        actionsAllowed,
        selectedRecords,
        setDialogVisible,
        setShowSaveFilterPopup,
        filters,
        handleFetchUpdatedRecords,
        setRecoverDialogVisible,

    }:
        any) => {
    // const [visible, setVisible] = useState<boolean>(false);
    const handleCustomButtonClick = useHandleListCustomButtonClick();
    const [openImportDialog, setOpenImportDialog] = useState<boolean>(false);
    const op = useRef(null);
    const exportRef = useRef(null);
    const customizeLayout = useRef<OverlayPanel | null>(null);
    const pathname = usePathname();
    const router = useRouter();
    const [view, setView] = useState<string>("");
    const [exportView, setExportView] = useState<boolean>(false);
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);


    const handleViewChange = (newView: string) => {
        if (view === newView) return; // Prevent unnecessary updates
        const pathSegments = pathname.split('/').filter(Boolean);
        pathSegments[pathSegments.length - 1] = newView; // Replace the last part with new view
        const newPath = '/' + pathSegments.join('/');
        router.push(newPath);
    };

    useEffect(() => {
        if (typeof pathname === 'string') {
            const pathSegments = pathname.split('/').filter(Boolean);
            if (pathSegments.length > 0) {
                setView(pathSegments[pathSegments.length - 1]);
            }
        }
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                customizeLayout.current &&
                !customizeLayout.current.getElement()?.contains(event.target as Node)
            ) {
                setIsOverlayOpen(false);
            }
        };

        if (isOverlayOpen) {
            document.addEventListener("click", handleClickOutside);
        } else {
            document.removeEventListener("click", handleClickOutside);
        }

        return () => document.removeEventListener("click", handleClickOutside);
    }, [isOverlayOpen])


    //Build a map of actionKey → boolean at the top level
    const headerActions = solidListViewLayout?.attrs ?? {};

    const normalizeAction = (value: boolean | string[]) => {
        if (value === true) return { enabled: true, roles: [] };
        if (value === false) return { enabled: false, roles: [] };
        if (Array.isArray(value)) return { enabled: true, roles: value };
        return { enabled: true, roles: [] }; // default
    };
    const normalized = {
        import: normalizeAction(headerActions.import),
        export: normalizeAction(headerActions.export),
        customizeLayout: normalizeAction(headerActions.customizeLayout),
        savedFilters: normalizeAction(headerActions.savedFilters),
    };

    // Role checks
    const { data: session, status } = useSession();
    const user = session?.user;
    const useRoleCheck = (roles: string[]) => hasAnyRole(user?.roles, roles);

    // Map of action → roleCheck
    const roleCheckMap = {
        import: useRoleCheck(normalized.import.roles),
        export: useRoleCheck(normalized.export.roles),
        customizeLayout: useRoleCheck(normalized.customizeLayout.roles),
        savedFilters: useRoleCheck(normalized.savedFilters.roles),
    };

    const isHeaderActionEnabled = (action: keyof typeof normalized) => {
        const { enabled, roles } = normalized[action];

        // 1. If explicitly disabled
        if (!enabled) return false;

        // 2. If roles list exists → must have at least one
        if (roles.length > 0) {
            return roleCheckMap[action] === true;
        }
        // 3. No restrictions → enabled
        return true;
    };

    const clearLocalstorageCache = () => {
        const currentPageUrl = window.location.pathname; // Get the current page URL
        localStorage.removeItem(currentPageUrl); // Remove from local storage with the URL as the key
        window.location.reload();
    };

    return (
        <div className="position-relative">
            <Button
                type="button"
                size="small"
                icon="pi pi-cog"
                severity="secondary"
                className="solid-icon-button"
                outlined
                // @ts-ignore
                onClick={(e) => op.current.toggle(e)}
            />
            <Dialog header="Export" visible={exportView} headerClassName="solid-export-dialog-header" className="ExportDialog p-0 m-0" onHide={() => { if (!exportView) return; setExportView(false); }}>
                <SolidExport listViewMetaData={listViewMetaData} filters={filters} />
            </Dialog>
            <OverlayPanel ref={exportRef} className="listview-export-panel">

            </OverlayPanel>
            <OverlayPanel ref={op} className="listview-cogwheel-panel">
                {(
                    (actionsAllowed.includes(`${permissionExpression(params.modelName, 'deleteMany')}`) &&
                        viewData?.data?.solidView?.layout?.attrs?.delete !== false &&
                        selectedRecords.length > 0) ||
                    isHeaderActionEnabled('import') && actionsAllowed.includes(`${permissionExpression(params.modelName, 'create')}`) && actionsAllowed.includes(`${permissionExpression('importTransaction', 'create')}`) ||
                    isHeaderActionEnabled('export') && actionsAllowed.includes(`${permissionExpression(params.modelName, 'findMany')}`) && actionsAllowed.includes(`${permissionExpression('exportTransaction', 'create')}`) ||
                    isHeaderActionEnabled('customizeLayout') && actionsAllowed.includes(`${permissionExpression('userViewMetadata', 'create')}`) ||
                    isHeaderActionEnabled('savedFilters') && actionsAllowed.includes(`${permissionExpression('savedFilters', 'create')}`) ||
                    (solidListViewLayout?.attrs?.headerButtons
                        ?.some((rb: any) => rb.attrs.actionInContextMenu === true)) ||
                    viewData?.data?.solidView?.model?.enableSoftDelete
                ) && (
                        <>
                            <div className="p-2">
                                <div className="flex flex-column">
                                    {actionsAllowed.includes(`${permissionExpression(params.modelName, 'deleteMany')}`) && viewData?.data?.solidView?.layout?.attrs?.delete !== false && selectedRecords.length > 0 &&
                                        <Button
                                            text
                                            type="button"
                                            className="text-left gap-2 text-base"
                                            label="Delete"
                                            size="small"
                                            iconPos="left"
                                            severity="danger"
                                            icon={'pi pi-trash'}
                                            onClick={() => setDialogVisible(true)}
                                        />}
                                    {isHeaderActionEnabled("import") && actionsAllowed.includes(`${permissionExpression(params.modelName, 'create')}`) && actionsAllowed.includes(`${permissionExpression('importTransaction', 'create')}`) && (
                                        <Button text icon='pi pi-download' label="Import" size="small" severity="secondary" className="text-left gap-2 text-base"
                                            onClick={() => setOpenImportDialog(true)}
                                        />
                                    )}
                                    {isHeaderActionEnabled("export") && actionsAllowed.includes(`${permissionExpression(params.modelName, 'findMany')}`) && actionsAllowed.includes(`${permissionExpression('exportTransaction', 'create')}`) && (
                                        <Button text icon='pi pi-upload' label="Export" size="small" severity="secondary" className="text-left gap-2 text-base"
                                            // @ts-ignore
                                            onClick={() => { setExportView((exportView) => !exportView); }} />
                                    )}
                                    {solidListViewLayout?.attrs?.headerButtons
                                        ?.filter((rb: any) => rb.attrs.actionInContextMenu === true)
                                        ?.map((button: any, index: number) => (
                                            <SolidListViewHeaderContextMenuButton
                                                key={index}
                                                button={button}
                                                params={params}
                                                solidListViewMetaData={listViewMetaData}
                                                handleCustomButtonClick={handleCustomButtonClick}
                                            />
                                        ))}
                                    {viewData?.data?.solidView?.model?.enableSoftDelete && (
                                        <div className="flex align-items-center px-3 gap-2 mt-2 mb-1">
                                            <Checkbox
                                                inputId="showArchived"
                                                checked={showArchived}
                                                onChange={() => setShowArchived(!showArchived)}
                                            />
                                            <label htmlFor="showArchived" className="ml-2 text-base solid-secondary-text-color">
                                                Show Archived Records
                                            </label>
                                        </div>
                                    )}
                                    {showArchived && (
                                        <Button text icon='pi pi-refresh' label="Recover" size="small" severity="secondary" className="flex lg:hidden text-left gap-2 text-base "
                                            onClick={() => setRecoverDialogVisible(true)} />
                                    )}

                                    <div className="flex flex-column lg:hidden">
                                        {solidListViewLayout?.attrs?.headerButtons
                                            ?.filter((rb: any) => rb.attrs.actionInContextMenu != true)
                                            ?.map((button: any, index: number) => (
                                                <SolidListViewHeaderButton
                                                    key={index}
                                                    button={button}
                                                    params={params}
                                                    solidListViewMetaData={listViewMetaData}
                                                    handleCustomButtonClick={handleCustomButtonClick}
                                                    selectedRecords={selectedRecords}
                                                    filters={filters}
                                                />
                                            ))}
                                    </div>

                                </div>
                            </div>
                            <Divider className="m-0" />
                        </>
                    )}
                <div className="p-2 relative flex flex-column gap-1">
                    {isHeaderActionEnabled('customizeLayout') && permissionExpression('userViewMetadata', 'create') && (<Button
                        icon='pi pi-sliders-h'
                        label="Customize Layout"
                        severity={isOverlayOpen ? undefined : "secondary"}
                        size="small"
                        text={isOverlayOpen ? false : true}
                        className="text-left gap-2 w-full text-base"
                        // @ts-ignore
                        onClick={(e) => {
                            customizeLayout.current?.toggle(e);
                            setIsOverlayOpen((prev) => !prev); // ✅ Ensure state updates when toggled
                        }}
                    >
                        <i className="pi pi-chevron-right text-sm"></i>
                    </Button>
                    )}
                    {isHeaderActionEnabled('savedFilters') && permissionExpression('savedFilters', 'create') && (
                        <Button text icon='pi pi-save' label="Save Custom Filter" size="small" severity="secondary" className="text-left gap-2 text-base" onClick={() => setShowSaveFilterPopup(true)} />
                    )}
                    <Button text icon='pi pi-trash' label="Clear cache" size="small" severity="secondary" className="text-left gap-2 text-base "
                        onClick={() => clearLocalstorageCache()} />

                    <OverlayPanel ref={customizeLayout} className="customize-layout-panel" style={{ minWidth: 250 }}
                        onShow={() => setIsOverlayOpen(true)}
                        onHide={() => {
                            setTimeout(() => setIsOverlayOpen(false), 50); // ✅ Ensure state updates
                        }}
                    >
                        <div className="solid-layout-accordion">
                            <Accordion multiple expandIcon="pi pi-chevron-down" collapseIcon="pi pi-chevron-up" activeIndex={[2]}>
                                {viewModes && viewModes.length > 0 &&
                                    <AccordionTab header="Switch Type">
                                        <div className="flex flex-column gap-1 p-1">
                                            {viewModes.map((option: any) => (
                                                <div key={option.value} className={`flex align-items-center ${option.value === view ? 'solid-active-view' : 'solid-view'}`}>
                                                    <RadioButton
                                                        inputId={option.value}
                                                        name="views"
                                                        value={option.value}
                                                        // onChange={(e) => router}
                                                        onChange={() => handleViewChange(option.value)}
                                                        checked={option.value === view}
                                                    />
                                                    <label htmlFor={option.value} className="ml-2 flex align-items-center justify-content-between w-full">
                                                        {option.label}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionTab>
                                }
                                <AccordionTab header="Row Spacing">
                                    <div className="flex flex-column gap-1 p-1flex flex-column gap-1 p-1">
                                        {sizeOptions.map((option: any) => (
                                            <div key={option.value} className={`flex align-items-center ${option.value === size ? 'solid-active-view' : 'solid-view'}`}>
                                                <RadioButton
                                                    inputId={option.value}
                                                    name="sizes"
                                                    value={option.value}
                                                    onChange={(e) => setSize(e.value)}
                                                    checked={option.value === size}
                                                />
                                                <label htmlFor={option.value} className="ml-2 flex align-items-center justify-content-between w-full">
                                                    {option.label}
                                                    <Image
                                                        src={option.image}
                                                        alt={option.value}
                                                        fill
                                                        className='relative row-spacing-img'
                                                    />
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionTab>
                                <AccordionTab header="Column Selector" headerClassName="pb-0">
                                    <SolidListColumnSelector listViewMetaData={listViewMetaData} customizeLayout={customizeLayout} />
                                </AccordionTab>
                            </Accordion>
                        </div>
                    </OverlayPanel>
                </div>
            </OverlayPanel>
            {openImportDialog &&
                <SolidGenericImport
                    openImportDialog={openImportDialog}
                    setOpenImportDialog={setOpenImportDialog}
                    listViewMetaData={listViewMetaData}
                    handleFetchUpdatedRecords={handleFetchUpdatedRecords}
                />
            }
        </div>
    )
}
