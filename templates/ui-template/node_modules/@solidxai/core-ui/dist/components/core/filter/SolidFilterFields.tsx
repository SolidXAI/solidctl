
import SolidBigintField from "./fields/SolidBigintField";
import SolidFloatField from "./fields/SolidFloatField";
import SolidDecimalField from "./fields/SolidDecimalField";
import SolidShortTextField from "./fields/SolidShortTextField";
import SolidLongTextField from "./fields/SolidLongTextField";
import SolidRichTextField from "./fields/SolidRichTextField";
import SolidBooleanField from "./fields/SolidBooleanField";
import SolidDateField from "./fields/SolidDateField";
import SolidDatetimeField from "./fields/SolidDatetimeField";
import SolidTimeField from "./fields/SolidTimeField";
import SolidRelationField from "./fields/SolidRelationField";
import SolidMediaSingleField from "./fields/SolidMediaSingleField";
import SolidMediaMultipleField from "./fields/SolidMediaMultipleField";
import SolidSelectionStaticField from "./fields/SolidSelectionStaticField";
import SolidSelectionDynamicField from "./fields/SolidSelectionDynamicField";
import SolidComputedField from "./fields/SolidComputedField";
import SolidExternalIdField from "./fields/SolidExternalIdField";
import SolidUuidField from "./fields/SolidUuidField";
import SolidIntField from "./fields/SolidIntField";
// import SolidRelationField from "./columns/SolidRelationField";
// import SolidMediaSingleField from "./columns/SolidMediaSingleField";
// import SolidMediaMultipleField from "./columns/SolidMediaMultipleField";
// import SolidSelectionStaticField from "./columns/SolidSelectionStaticField";
// import SolidSelectionDynamicField from "./columns/SolidSelectionDynamicField";
// import SolidComputedField from "./columns/SolidComputedField";
// import SolidExternalIdField from "./columns/SolidExternalIdField";
// import SolidUuidField from "./columns/SolidUuidField";

export type SolidFilterFieldsParams = {
    solidViewMetaData?: any;
    fieldMetadata: any,
    onChange: any,
    index: any,
    rule: any
};

export const getNumberOfInputs = (matchMode: any): number | null => {

    switch (matchMode) {
        case '$between':
            return 2;
        case '$in':
        case '$notIn':
            return null;
        case '$startsWith':
        case '$contains':
        case '$notContains':
        case '$endsWith':
        case '$equals':
        case '$notEquals':
        case '$lt':
        case '$lte':
        case '$gt':
        case '$gte':
            return 1;
        case '$null':
        case '$notNull':
            return 0;    
        default:
            return 1; // Default to single input if no specific match is found
    }
}

export const SolidFilterFields = ({ fieldMetadata, onChange, index, rule }: SolidFilterFieldsParams) => {

    if (fieldMetadata) {

        // And finally we can implement additional switching logic based on certain special fields. 
        if (fieldMetadata.name === 'id') {
            return SolidIntField({ fieldMetadata, onChange, index, rule });
        }
        if (fieldMetadata.type === 'int') {
            return SolidIntField({ fieldMetadata, onChange, index, rule });
        }
        if (fieldMetadata.type === 'bigint') {
            return SolidBigintField({ fieldMetadata, onChange, index, rule });
        }
        if (fieldMetadata.type === 'float') {
            return SolidFloatField({ fieldMetadata, onChange, index, rule });
        }
        if (fieldMetadata.type === 'decimal') {
            return SolidDecimalField({ fieldMetadata, onChange, index, rule });
        }
        if (fieldMetadata.type === 'shortText') {
            return SolidShortTextField({ fieldMetadata, onChange, index, rule });
        }
        if (fieldMetadata.type === 'longText') {
            return SolidLongTextField({ fieldMetadata, onChange, index, rule });
        }
        if (fieldMetadata.type === 'richText') {
            return SolidRichTextField({ fieldMetadata, onChange, index, rule });
        }
        if (fieldMetadata.type === 'boolean') {
            return SolidBooleanField({ fieldMetadata, onChange, index, rule });
        }
        if (fieldMetadata.type === 'date') {
            return SolidDateField({ fieldMetadata, onChange, index, rule });
        }
        if (fieldMetadata.type === 'datetime') {
            return SolidDatetimeField({ fieldMetadata, onChange, index, rule });
        }
        if (fieldMetadata.type === 'time') {
            return SolidTimeField({ fieldMetadata, onChange, index, rule });
        }
        if (fieldMetadata.type === 'relation') {
            return SolidRelationField({ fieldMetadata, onChange, index, rule });
        }
        if (fieldMetadata.type === 'mediaSingle') {
            return SolidMediaSingleField({ fieldMetadata, onChange, index, rule });
        }
        if (fieldMetadata.type === 'mediaMultiple') {
            return SolidMediaMultipleField({ fieldMetadata, onChange, index, rule });
        }
        if (fieldMetadata.type === 'selectionStatic') {
            return SolidSelectionStaticField({ fieldMetadata, onChange, index, rule });
        }
        if (fieldMetadata.type === 'selectionDynamic') {
            return SolidSelectionDynamicField({ fieldMetadata, onChange, index, rule });
        }
        if (fieldMetadata.type === 'computed') {
            return SolidComputedField({ fieldMetadata, onChange, index, rule });
        }
        if (fieldMetadata.type === 'externalId') {
            return SolidExternalIdField({ fieldMetadata, onChange, index, rule });
        }
        if (fieldMetadata.type === 'uuid') {
            return SolidUuidField({ fieldMetadata, onChange, index, rule });
        }
    }
};
