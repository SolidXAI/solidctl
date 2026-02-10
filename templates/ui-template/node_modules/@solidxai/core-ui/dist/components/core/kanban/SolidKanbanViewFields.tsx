
import SolidBigintKanbanField from "./kanban-fields/SolidBigintKanbanField";
import SolidBooleanKanbanField from "./kanban-fields/SolidBooleanKanbanField";
import SolidComputedKanbanField from "./kanban-fields/SolidComputedKanbanField";
import SolidDateKanbanField from "./kanban-fields/SolidDateKanbanField";
import SolidDatetimeKanbanField from "./kanban-fields/SolidDatetimeKanbanField";
import SolidDecimalKanbanField from "./kanban-fields/SolidDecimalKanbanField";
import SolidExternalIdKanbanField from "./kanban-fields/SolidExternalIdKanbanField";
import SolidFloatKanbanField from "./kanban-fields/SolidFloatKanbanField";
import SolidIntKanbanField from "./kanban-fields/SolidIntKanbanField";
import SolidLongTextKanbanField from "./kanban-fields/SolidLongTextKanbanField";
import SolidMediaMultipleKanbanField from "./kanban-fields/SolidMediaMultipleKanbanField";
import SolidMediaSingleKanbanField from "./kanban-fields/SolidMediaSingleKanbanField";
import SolidRelationKanbanField from "./kanban-fields/SolidRelationKanbanField";
import SolidRichTextKanbanField from "./kanban-fields/SolidRichTextKanbanField";
import SolidSelectionDynamicKanbanField from "./kanban-fields/SolidSelectionDynamicKanbanField";
import SolidSelectionStaticKanbanField from "./kanban-fields/SolidSelectionStaticKanbanField";
import SolidShortTextKanbanField from "./kanban-fields/SolidShortTextKanbanField";
import SolidTimeKanbanField from "./kanban-fields/SolidTimeKanbanField";
import SolidUuidKanbanField from "./kanban-fields/SolidUuidKanbanField";

export type SolidKanbanViewFieldsParams = {
    solidKanbanViewMetaData: any;
    fieldMetadata: any,
    fieldLayout: any,
    data: any,
    setLightboxUrls?: any,
    setOpenLightbox?: any,
    groupedView?: boolean
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
// const components = require.context('./kanban-fields', false, /Solid.*Column\.tsx$/);

// // Define a function to dynamically load components based on type
// const loadComponentByType = async (type: string) => {
//     try {
//         const componentName = `./kanban-fields/Solid${type.charAt(0).toUpperCase() + type.slice(1)}Column.tsx`;

//         // Dynamically import the component based on type
//         const componentModule = await import(componentName);

//         return componentModule.default;
//     } catch (error) {
//         console.error(`Failed to load component for type: ${type}`, error);
//         return null;
//     }
// };

export const SolidKanbanViewFields = ({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data, setLightboxUrls, setOpenLightbox, groupedView }: SolidKanbanViewFieldsParams) => {
    if(!fieldMetadata) return null
    // And finally we can implement additional switching logic based on certain special fields. 
    if (fieldMetadata.name === 'id') {
        return SolidIntKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data });
    }

    if (fieldMetadata.type === 'int') {
        return SolidIntKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data });
    }
    if (fieldMetadata.type === 'bigint') {
        return SolidBigintKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data });
    }
    if (fieldMetadata.type === 'float') {
        return SolidFloatKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data });
    }
    if (fieldMetadata.type === 'decimal') {
        return SolidDecimalKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data });
    }
    if (fieldMetadata.type === 'shortText') {
        return SolidShortTextKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data, setLightboxUrls, setOpenLightbox, groupedView });
    }
    if (fieldMetadata.type === 'longText') {
        return SolidLongTextKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data, groupedView });
    }
    if (fieldMetadata.type === 'richText') {
        return SolidRichTextKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data });
    }
    if (fieldMetadata.type === 'boolean') {
        return SolidBooleanKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data });
    }
    if (fieldMetadata.type === 'date') {
        return SolidDateKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data });
    }
    if (fieldMetadata.type === 'datetime') {
        return SolidDatetimeKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data });
    }
    if (fieldMetadata.type === 'time') {
        return SolidTimeKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data });
    }
    if (fieldMetadata.type === 'relation') {
        return SolidRelationKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data });
    }
    if (fieldMetadata.type === 'mediaSingle') {
        return SolidMediaSingleKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data, setLightboxUrls, setOpenLightbox });
    }
    if (fieldMetadata.type === 'mediaMultiple') {
        return SolidMediaMultipleKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data, setLightboxUrls, setOpenLightbox });
    }
    if (fieldMetadata.type === 'selectionStatic') {
        return SolidSelectionStaticKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data });
    }
    if (fieldMetadata.type === 'selectionDynamic') {
        return SolidSelectionDynamicKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data });
    }
    if (fieldMetadata.type === 'computed') {
        return SolidComputedKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data });
    }
    if (fieldMetadata.type === 'externalId') {
        return SolidExternalIdKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data });
    }
    if (fieldMetadata.type === 'uuid') {
        return SolidUuidKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data });
    }
    // // Load everything else based on type and dynamically.
    // else {
    //     const ComponentFound = await loadComponentByType(fieldMetadata.type);
    //     const ComponentNotFound = ({ solidKanbanViewMetaData, fieldMetadata, fieldLayout,data }: SolidKanbanViewFieldsParams) => (
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

    //     return ComponentFound ? ComponentFound({ solidKanbanViewMetaData, fieldMetadata, fieldLayout,data }) : ComponentNotFound({ solidKanbanViewMetaData, fieldMetadata, fieldLayout,data });
    // }

    // TODO: we can implement additional switching logic based on the widget type being used to render the list view data.

};
