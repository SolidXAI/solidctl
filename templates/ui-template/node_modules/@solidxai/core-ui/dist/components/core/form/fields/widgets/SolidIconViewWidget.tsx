import { SolidFormFieldWidgetProps } from "../../../../../types/solid-core";

export const SolidIconViewWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const fieldName = fieldLayoutInfo?.attrs?.name;
    const selectedIcon = formik.values?.[fieldName];

    const formattedIconName = selectedIcon
        ? selectedIcon
            .split('_')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        : '';

    return (
        <div>
            <label className="form-field-label">{fieldLabel}</label>
            {selectedIcon ? (
                <div className="mt-2" style={{display:'inline-block'}}>
                    <span className="material-symbols-outlined" style={{ fontSize: 48 , cursor:'pointer'}}>
                        {selectedIcon}
                    </span>
                    <p className="mb-0 text-center">{formattedIconName}</p>
                </div>
            ) : (
                <p className="mt-2">No icon selected.</p>
            )}
        </div>
    );
};