
import SolidBigintColumn from "./columns/SolidBigintColumn";
import SolidBooleanColumn from "./columns/SolidBooleanColumn";
import SolidComputedColumn from "./columns/SolidComputedColumn";
import SolidDateColumn from "./columns/SolidDateColumn";
import SolidDatetimeColumn from "./columns/SolidDatetimeColumn";
import SolidDecimalColumn from "./columns/SolidDecimalColumn";
import SolidExternalIdColumn from "./columns/SolidExternalIdColumn";
import SolidFloatColumn from "./columns/SolidFloatColumn";
import SolidIntColumn from "./columns/SolidIntColumn";
import SolidLongTextColumn from "./columns/SolidLongTextColumn";
import SolidMediaMultipleColumn from "./columns/SolidMediaMultipleColumn";
import SolidMediaSingleColumn from "./columns/SolidMediaSingleColumn";
import SolidRelationColumn from "./columns/SolidRelationColumn";
import SolidRichTextColumn from "./columns/SolidRichTextColumn";
import SolidSelectionDynamicColumn from "./columns/SolidSelectionDynamicColumn";
import SolidSelectionStaticColumn from "./columns/SolidSelectionStaticColumn";
import SolidShortTextColumn from "./columns/SolidShortTextColumn";
import SolidTimeColumn from "./columns/SolidTimeColumn";
import SolidUuidColumn from "./columns/SolidUuidColumn";

export type SolidListViewColumnParams = {
    solidListViewMetaData: any;
    fieldMetadata: any,
    column: any,
    setLightboxUrls?: any,
    setOpenLightbox?: any
};

export const getNumberOfInputs = (matchMode: any): number | null => {
    if (matchMode.label && matchMode.label === 'Not In') {
        matchMode = 'notIn';
    }

    switch (matchMode) {
        case 'between':
            return 2;
        case 'in':
        case 'notIn':
            return null;
        case 'startsWith':
        case 'contains':
        case 'notContains':
        case 'endsWith':
        case 'equals':
        case 'notEquals':
        case 'lt':
        case 'lte':
        case 'gt':
        case 'gte':
            return 1;
        default:
            return 1; // Default to single input if no specific match is found
    }
}

// // @ts-ignore
// const components = require.context('./columns', false, /Solid.*Column\.tsx$/);

// // Define a function to dynamically load components based on type
// const loadComponentByType = async (type: string) => {
//     try {
//         const componentName = `./columns/Solid${type.charAt(0).toUpperCase() + type.slice(1)}Column.tsx`;

//         // Dynamically import the component based on type
//         const componentModule = await import(componentName);

//         return componentModule.default;
//     } catch (error) {
//         console.error(`Failed to load component for type: ${type}`, error);
//         return null;
//     }
// };

export const SolidListViewColumn = ({ solidListViewMetaData, fieldMetadata, column, setLightboxUrls, setOpenLightbox }: SolidListViewColumnParams) => {

    // And finally we can implement additional switching logic based on certain special fields. 
    if (fieldMetadata.name === 'id') {
        return SolidIntColumn({ solidListViewMetaData, fieldMetadata, column });
    }

    if (fieldMetadata.type === 'int') {
        return SolidIntColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.type === 'bigint') {
        return SolidBigintColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.type === 'float') {
        return SolidFloatColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.type === 'decimal') {
        return SolidDecimalColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.type === 'shortText') {
        return SolidShortTextColumn({ solidListViewMetaData, fieldMetadata, column, setLightboxUrls, setOpenLightbox });
    }
    if (fieldMetadata.type === 'longText') {
        return SolidLongTextColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.type === 'richText') {
        return SolidRichTextColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.type === 'email') {
        return SolidShortTextColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.type === 'boolean') {
        return SolidBooleanColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.type === 'date') {
        return SolidDateColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.type === 'datetime') {
        return SolidDatetimeColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.type === 'time') {
        return SolidTimeColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.type === 'relation') {
        return SolidRelationColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.type === 'mediaSingle') {
        return SolidMediaSingleColumn({ solidListViewMetaData, fieldMetadata, column, setLightboxUrls, setOpenLightbox });
    }
    if (fieldMetadata.type === 'mediaMultiple') {
        return SolidMediaMultipleColumn({ solidListViewMetaData, fieldMetadata, column, setLightboxUrls, setOpenLightbox });
    }
    if (fieldMetadata.type === 'selectionStatic') {
        return SolidSelectionStaticColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.type === 'selectionDynamic') {
        return SolidSelectionDynamicColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.type === 'computed') {
        return SolidComputedColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.type === 'externalId') {
        return SolidExternalIdColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.type === 'uuid') {
        return SolidUuidColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    // // Load everything else based on type and dynamically.
    // else {
    //     const ComponentFound = await loadComponentByType(fieldMetadata.type);
    //     const ComponentNotFound = ({ solidListViewMetaData, fieldMetadata, column }: SolidListViewColumnParams) => (
    //         <Column
    //             key={fieldMetadata.name}
    //             field={fieldMetadata.name}
    //             header={fieldMetadata.displayName}
    //             className="text-sm"
    //             sortable={false}
    //             filter={false}
    //             showFilterOperator={false}
    //             body={() => (<span>Type not supported</span>)}
    //             style={{ minWidth: "12rem" }}
    //             headerClassName="table-header-fs"
    //         ></Column>
    //     );

    //     return ComponentFound ? ComponentFound({ solidListViewMetaData, fieldMetadata, column }) : ComponentNotFound({ solidListViewMetaData, fieldMetadata, column });
    // }

    // TODO: we can implement additional switching logic based on the widget type being used to render the list view column.

};
