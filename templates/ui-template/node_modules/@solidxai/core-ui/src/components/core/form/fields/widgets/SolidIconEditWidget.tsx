
import { solidIcons } from "../../../../../helpers/solidIcons";
import { SolidFormFieldWidgetProps } from "../../../../../types/solid-core";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { useEffect, useState } from "react";

export const SolidIconEditWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    console.log("SolidIconWidget", "formik : ", formik, "fieldContext : ", fieldContext);

    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const fieldName = fieldLayoutInfo?.attrs?.name;

    const [openIconDialog, setOpenIconDialog] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [searchIcon, setSearchIcon] = useState("");
    const [selectedIcon, setSelectedIcon] = useState(formik.values?.[fieldName] || "");

    // const [iconVariant, setIconVariant] = useState(formik.values.iconVariant || "outlined");

    // const iconVariants = [
    //     { label: "Outlined", value: "outlined" },
    //     { label: "Rounded", value: "rounded" },
    //     { label: "Sharp", value: "sharp" }
    // ];

    const allIcons = solidIcons.flatMap(({ category, icons }) =>
        icons.map((icon) => ({ icon, category }))
    );

    const filteredIcons = (selectedCategory === "All" ? allIcons :
        allIcons.filter((i) => i.category === selectedCategory)
    ).filter(({ icon }) => icon.toLowerCase().includes(searchIcon.toLowerCase()));

    const tabs = ["All", ...solidIcons.map((c) => c.category)];

    useEffect(() => {
        if (openIconDialog) {
            setSelectedIcon(formik?.values?.[fieldName] ?? "");
            // setIconVariant(formik.values.iconVariant ?? "outlined");
        }
    }, [openIconDialog]);

    const handleSelectIcon = (icon: string) => {
        setSelectedIcon(icon);
        // setIconVariant(variant)
        formik.setFieldValue(fieldName, icon);
        // formik.setFieldValue("iconVariant", variant);
    };

    const handleRemoveIcon = () => {
        setSelectedIcon("");
        // setIconVariant(null)
        formik.setFieldTouched(fieldName, true);
        formik.setFieldValue(fieldName, "", true);
        // formik.setFieldValue("iconVariant", null);
    };

    return (
        <div>
            <label className="form-field-label">{fieldLabel}</label>
            <div className="flex align-items-end gap-3 mt-2">
                <div style={{ display: 'inline-block' }}>
                    {selectedIcon ? (
                        // <Button
                        //     type="button"
                        //     icon={<span className={`material-symbols-outlined`}>{selectedIcon}</span>}
                        //     onClick={() => setOpenIconDialog(true)}
                        //     outlined
                        // />
                        <div>
                            <span className={`material-symbols-outlined`} style={{ fontSize: 48, cursor: 'pointer' }} onClick={() => setOpenIconDialog(true)}>
                                {selectedIcon}
                            </span>
                            <p className="mb-0 text-center">
                                {selectedIcon
                                    .split('_')
                                    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ')
                                }
                            </p>
                        </div>
                    ) : (
                        <Button
                            type="button"
                            size="small"
                            label="Select Icon"
                            onClick={() => setOpenIconDialog(true)}
                            outlined
                        />
                    )}
                </div>
                {selectedIcon && (
                    <div>
                        <Button
                            type="button"
                            label="Remove"
                            className="p-button-text p-button-danger ml-2"
                            onClick={() => {
                                setSelectedIcon("");
                                formik.setFieldValue(fieldName, "");
                            }}
                        />
                    </div>
                )}
            </div>
            <Dialog contentClassName="p-0" className="solid-icon-dialog" contentStyle={{ borderRadius: 6 }} showHeader={false} header={false} closable={false} visible={openIconDialog} style={{ width: '70vw', height: '70vh' }} breakpoints={{ '1024px': '75vw','991px': '90vw','767px':'94w', '250px': '96vw'}} onHide={() => setOpenIconDialog(false)}>
                <div>
                    <div className="grid m-0 flex-column md:flex-row ">
                        <div className="col-12 lg:col-3 p-0">
                            <div className="flex flex-column justify-content-between p-3 lg:p-4" style={{ height: '100%' }}>
                                <div className="">
                                    {/* <p className="font-medium">Variant</p>
                                    <Dropdown
                                        value={iconVariant}
                                        onChange={(e) => setIconVariant(e.value)}
                                        options={iconVariants}
                                        optionLabel="label"
                                        className="w-full mb-3"
                                        checkmark
                                        highlightOnSelect={false}
                                        placeholder="Select Variant"
                                    /> */}

                                    <p className="font-medium">Category</p>
                                    <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap" }} className="solid-icon-category-wrapper">
                                        {tabs.map((tab) => (
                                            <Button
                                                type='button'
                                                key={tab}
                                                size="small"
                                                onClick={() => {
                                                    setSelectedCategory(tab);
                                                    setSearchIcon("");
                                                }}
                                                outlined={selectedCategory === tab ? false : true}
                                                style={{
                                                    padding: "8px 16px",
                                                    fontSize: 12
                                                }}
                                                className="solid-icon-category"
                                                severity="secondary"
                                            >
                                                {tab}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button type="button" size="small" label="Select" onClick={() => setOpenIconDialog(false)} />
                                    <Button type="button" size="small" outlined label="Cancel" onClick={() => setOpenIconDialog(false)} />
                                </div>
                            </div>
                        </div>

                        <div className="col-6 p-0 flex lg:hidden">
                            <div className="p-3 lg:p-4">
                                <p className="font-medium">Selected Icon</p>
                                {selectedIcon && (
                                    <>
                                        <div className="flex justify-content-center">
                                            <span className={`material-symbols-outlined`} style={{ fontSize: 100 }}>
                                                {selectedIcon}
                                            </span>
                                        </div>
                                        <p className='mt-2 text-center'>
                                            {selectedIcon
                                                .split('_')
                                                .map((word: any) => word.charAt(0).toUpperCase() + word.slice(1))
                                                .join(' ')
                                            }
                                        </p>
                                        {/* <code className="mt-2 d-block">
                                            {`<span class="material-symbols-${iconVariant || "outlined"}">${selectedIcon}</span>`}
                                        </code> */}
                                    </>
                                )}
                            </div>

                        </div>
                        <div className="col-12 lg:col-6 p-0" style={{ borderLeft: '1px solid var(--primary-light-color)', borderRight: '1px solid var(--primary-light-color)' }}>
                            <div className="px-3 lg:px-4 pt-3 lg:pt-4">
                                <div>
                                    <p className="font-medium">Select Icon</p>
                                    <InputText
                                        type="text"
                                        placeholder={`Search icons in "${selectedCategory}"`}
                                        value={searchIcon}
                                        onChange={(e) => setSearchIcon(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            <div style={{ height: 'calc(70vh - 125px)', overflowY: 'auto', overflowX: 'hidden' }} className="px-4 pb-3 mt-4">
                                <div className="grid">
                                    {filteredIcons.length > 0 ? (
                                        filteredIcons.map(({ icon, category }) => (
                                            <div className="col-3" key={icon}>
                                                <div className="w-full flex flex-column align-items-center justify-content-center gap-3">
                                                    <span
                                                        className={`material-symbols-outlined`}
                                                        style={{
                                                            fontSize: 32,
                                                            cursor: "pointer",
                                                            padding: "8px",
                                                            border: selectedIcon === icon ? "2px solid var(--primary-color)" : "2px solid transparent",
                                                            borderRadius: "6px",
                                                        }}
                                                        onClick={() => handleSelectIcon(icon)}
                                                        title={`${icon} (${category})`}
                                                    >
                                                        {icon}
                                                    </span>
                                                    <p className='mb-0 mt-1 text-center'>
                                                        {icon
                                                            .split('_')
                                                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                                            .join(' ')
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="mt">No icons found.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="col-3 p-0 hidden lg:flex">
                            <div className="p-3 lg:p-4">
                                <p className="font-medium">Selected Icon</p>
                                {selectedIcon && (
                                    <>
                                        <div className="flex justify-content-center">
                                            <span className={`material-symbols-outlined`} style={{ fontSize: 100 }}>
                                                {selectedIcon}
                                            </span>
                                        </div>
                                        <p className='mt-2 text-center'>
                                            {selectedIcon
                                                .split('_')
                                                .map((word: any) => word.charAt(0).toUpperCase() + word.slice(1))
                                                .join(' ')
                                            }
                                        </p>
                                        {/* <code className="mt-2 d-block">
                                            {`<span class="material-symbols-${iconVariant || "outlined"}">${selectedIcon}</span>`}
                                        </code> */}
                                    </>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};