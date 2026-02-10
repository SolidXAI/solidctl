
import { useEffect, useState } from "react";
import { Message } from "primereact/message";
import { classNames } from "primereact/utils";
import { SelectButton } from "primereact/selectbutton";
import { AutoComplete, AutoCompleteCompleteEvent } from "primereact/autocomplete";
import { RadioButton } from "primereact/radiobutton";
import { SolidFormFieldWidgetProps } from "../../../../../types/solid-core";
import { AvatarWidget } from "../../../../../components/core/common/AvatarWidget";

export const SolidRelationFieldAvatarFormWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {

    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const userKeyFieldName = fieldMetadata.relationModel?.userKeyField?.name;
    const [fieldValue, setFieldValue] = useState<any>([]);
    useEffect(() => {        
        let rawValue = fieldContext.data?.[fieldLayoutInfo.attrs.name];
        let value: any[] = [];
        if (Array.isArray(rawValue)) {
            value = rawValue.map((item: any) => ({ label: item?.[userKeyFieldName] ?? '' }));
        } else if (rawValue && typeof rawValue === "object") {
            value = [{ label: rawValue[userKeyFieldName] ?? '' }];
        }
        if (Array.isArray(value)) {

            if (value.length > 0) {
                const data = value.map((v: any) => v.label);
                setFieldValue(data);
            }
        }
        // if (value && !Array.isArray(value) && typeof value === "object") {
        //     setFieldValue([value.label]);
        // }
    }, [fieldContext]);



    return (
        <div className="mt-2 flex-column">
            <p className="m-0 form-field-label font-medium">{fieldLabel}</p>
            <div className="flex flex-wrap gap-2 mt-2">
                {fieldValue.map((v: any) => (
                    <AvatarWidget value={v} />
                ))}
            </div>
        </div>
    );
}
