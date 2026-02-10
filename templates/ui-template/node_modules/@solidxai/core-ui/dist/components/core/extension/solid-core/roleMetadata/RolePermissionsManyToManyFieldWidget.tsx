
import { capitalize } from "lodash";
import { Panel } from "primereact/panel";
import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { InputSwitch } from "primereact/inputswitch";
import { useRelationEntityHandler } from "../../../../../components/core/form/fields/relations/widgets/helpers/useRelationEntityHandler";
import { InlineRelationEntityDialog } from "../../../../../components/core/form/fields/relations/widgets/helpers/InlineRelationEntityDialog";
import { Checkbox } from "primereact/checkbox";
import { SolidFormFieldWidgetProps } from "../../../../../types/solid-core";
import qs from 'qs';

const groupByController = (items: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    items.forEach((item) => {
        const controllerName = item.label.split(".")[0];
        if (!grouped[controllerName]) {
            grouped[controllerName] = [];
        }
        grouped[controllerName].push(item);
    });
    return grouped;
};

export const RolePermissionsManyToManyFieldWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const fieldLayoutInfo = fieldContext.field;

    const readOnlyPermission = fieldContext.readOnly;
    const [visibleCreateDialog, setVisibleCreateDialog] = useState(false);
    const { autoCompleteItems, fetchRelationEntities, addNewRelation } = useRelationEntityHandler({ fieldContext, formik });
    const [visibleDialogs, setVisibleDialogs] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        const queryData: any = {
            offset: 0,
            limit: 1000
        };
        const autocompleteQs = qs.stringify(queryData, {
            encodeValuesOnly: true,
        });
        fetchRelationEntities(autocompleteQs);
    }, []);

    const handleCheckboxChange = (e: any) => {
        if (formik.values[fieldLayoutInfo.attrs.name].some((item: any) => item.value === e.value)) {
            formik.setFieldValue(fieldLayoutInfo.attrs.name, formik.values[fieldLayoutInfo.attrs.name].filter((s: any) => s.value !== e.value));
        } else {
            formik.setFieldValue(fieldLayoutInfo.attrs.name, [...formik.values[fieldLayoutInfo.attrs.name], e]);
        }
    };

    const getHeaderTemplate = (controllerName: string) => (options: any) => {
        const className = `${options.className} justify-content-space-between`;
    
        return (
            <div className={className}>
                <div className="flex align-items-center gap-3">
                    <label className="form-field-label text-base lg:text-lg font-bold">
                        {controllerName}
                    </label>
                    {fieldContext.field.attrs.inlineCreate && (
                        <>
                            <Button
                                icon="pi pi-plus"
                                rounded
                                outlined
                                aria-label="Add"
                                type="button"
                                size="small"
                                onClick={() =>
                                    setVisibleDialogs((prev) => ({
                                        ...prev,
                                        [controllerName]: true,
                                    }))
                                }
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
                </div>
                <div>{options.togglerElement}</div>
            </div>
        );
    };
    
    const groupedEntities = groupByController(autoCompleteItems || []);
    return (
            <div>
                {Object.keys(groupedEntities).map((controllerName) => (
                    <Panel toggleable headerTemplate={getHeaderTemplate(controllerName)} key={controllerName} className="mt-3 lg:mt-4">
                        <div className="formgrid grid gap-3 lg:gap-0 ">
                            {groupedEntities[controllerName].map((entity: any, i: number) => {
                                const isChecked = formik.values[fieldLayoutInfo.attrs.name].some((item: any) => item.value === entity.value);
                                return (
                                    <div key={entity.label} className={`field col-12 lg:col-6  flex gap-2 ${i >= 2 ? 'lg:mt-3' : ''}`}>
                                        <Checkbox
                                            readOnly={readOnlyPermission}
                                            inputId={entity.label}
                                            checked={isChecked}
                                            onChange={() => handleCheckboxChange(entity)}
                                        />
                                        <label htmlFor={entity.label} className="form-field-label m-0 solid-permisson-form-label"> {entity.label}</label>
                                    </div>
                                )
                            })}
                        </div>
                    </Panel>
                ))}
                {Object.keys(groupedEntities).map((controllerName) => (
                    <InlineRelationEntityDialog
                        key={`dialog-${controllerName}`}
                        visible={visibleDialogs[controllerName] || false}
                        setVisible={(visible: any) =>
                            setVisibleDialogs((prev) => ({
                                ...prev,
                                [controllerName]: visible,
                            }))
                        }
                        fieldContext={fieldContext}
                        onCreate={addNewRelation}
                    />
                ))}
            </div>
        )
};