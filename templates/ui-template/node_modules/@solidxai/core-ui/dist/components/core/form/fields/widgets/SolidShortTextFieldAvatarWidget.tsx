
import { useEffect, useState } from "react";
import { Message } from "primereact/message";
import { classNames } from "primereact/utils";
import { SelectButton } from "primereact/selectbutton";
import { AutoComplete, AutoCompleteCompleteEvent } from "primereact/autocomplete";
import { RadioButton } from "primereact/radiobutton";
import { SolidFormFieldWidgetProps } from "../../../../../types/solid-core";
import { AvatarWidget } from "../../../../../components/core/common/AvatarWidget";

export const SolidShortTextFieldAvatarWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const value = formik.values[fieldLayoutInfo.attrs.name];
    const getInitials = (value: string) => {
        if (value) {
            const names = value?.trim().split(' ');
            const initials =
                names.length === 1
                    ? names[0][0]
                    : names[0][0] + names[names.length - 1][0];
            return initials.toUpperCase();
        } else {
            return ""
        }
    };

    const getColorFromInitials = (initials: string) => {
        let hash = 0;
        for (let i = 0; i < initials.length; i++) {
            hash = initials.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 60%, 60%)`; // nice pastel color
    };

    const initials = getInitials(value);
    const bgColor = getColorFromInitials(initials);


    return (
        <div className="mt-2 flex-column gap-2">
            <p className="m-0 form-field-label font-medium">{fieldLabel}</p>
            <div>
                {value &&
                    < div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                            style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                backgroundColor: bgColor,
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 600,
                                fontSize: 12,
                            }}
                        >
                            {initials}
                        </div>
                        <span>{value}</span>
                    </div>
                }
            </div>
        </div>
    );
}
