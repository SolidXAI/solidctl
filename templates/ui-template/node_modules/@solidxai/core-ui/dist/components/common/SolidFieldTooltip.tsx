
import { Tooltip } from 'primereact/tooltip';
import React from 'react'

export const SolidFieldTooltip = ({ fieldContext }: any) => {
    const solidFormViewMetaData = fieldContext.solidFormViewMetaData;
    const fieldLayoutInfo = fieldContext.field;
    const fieldMetadata = fieldContext.fieldMetadata;
    const showTooltip = solidFormViewMetaData.data.solidView?.layout?.attrs?.showTooltip ?? true;
    const tooltipPosition = solidFormViewMetaData.data.solidView?.layout?.attrs?.tooltipPosition;
    const fieldDescription = fieldLayoutInfo.attrs.description ?? fieldMetadata.description;

    return (
        showTooltip && fieldDescription &&
        <>
            <Tooltip className='solid-field-tooltip' target=".solid-field-tooltip-icon" />
            <i className="pi pi-info-circle solid-field-tooltip-icon"
                data-pr-tooltip={fieldDescription}
                data-pr-position={tooltipPosition}
            />
        </>
    )
}