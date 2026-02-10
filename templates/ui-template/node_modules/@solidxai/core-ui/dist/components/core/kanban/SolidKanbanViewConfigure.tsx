import { usePathname } from "../../../hooks/usePathname";
import { useRouter } from "../../../hooks/useRouter";
import { Accordion, AccordionTab } from 'primereact/accordion';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { OverlayPanel } from 'primereact/overlaypanel';
import { RadioButton } from 'primereact/radiobutton';
import { useEffect, useRef, useState } from 'react'

export const SolidKanbanViewConfigure = ({ solidKanbanViewMetaData, actionsAllowed, setLayoutDialogVisible, viewModes, setShowSaveFilterPopup }: any) => {
    const op = useRef(null);
    const customizeLayout = useRef<OverlayPanel | null>(null);
    const pathname = usePathname();
    const router = useRouter();
    const [view, setView] = useState<string>("");

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


    const [isOverlayOpen, setIsOverlayOpen] = useState(false);
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







    return (
        <div className="position-relative">
            <Button
                type="button"
                size="small"
                icon="pi pi-cog"
                severity="secondary"
                outlined
                className='solid-icon-button'
                // @ts-ignore
                onClick={(e) => op.current.toggle(e)}
            />
            <OverlayPanel ref={op}>
                <div className="p-2">
                    <div className="flex flex-column">
                        <Button text icon='pi pi-download' label="Import" size="small" severity="secondary" className="text-left gap-2 text-base" />
                        <Button text icon='pi pi-upload' label="Export" size="small" severity="secondary" className="text-left gap-2 text-base" />
                        <Button
                            text
                            type="button"
                            className="w-8rem text-left text-base gap-2 purple-200"
                            label="Layout"
                            size="small"
                            iconPos="left"
                            severity="contrast"
                            icon={'pi pi-objects-column'}
                            onClick={() => setLayoutDialogVisible(true)}
                        />
                    </div>
                </div>
                <Divider className="m-0" />
                <div className="p-2 relative flex flex-column gap-1">
                    <Button
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
                    <Button text icon='pi pi-save' label="Save Custom Filter" size="small" severity="secondary" className="text-left gap-2 text-base" onClick={() => setShowSaveFilterPopup(true)} />
                    <OverlayPanel ref={customizeLayout} className="customize-layout-panel" style={{ minWidth: 250 }}
                        onShow={() => setIsOverlayOpen(true)}
                        onHide={() => {
                            setTimeout(() => setIsOverlayOpen(false), 50); // ✅ Ensure state updates
                        }}
                    >

                        <div className="solid-layout-accordion">
                            <Accordion expandIcon="pi pi-chevron-down" collapseIcon="pi pi-chevron-up" activeIndex={[0]}>
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
                                                        {/* <Image
                                                        src={option.image}
                                                        alt={option.value}
                                                        fill
                                                        className='relative row-spacing-img'
                                                    /> */}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionTab>
                                }
                            </Accordion>
                        </div>
                    </OverlayPanel>
                </div>
            </OverlayPanel>
        </div>
    )
}
