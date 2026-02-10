
import { SolidKanbanViewFieldsParams } from '../SolidKanbanViewFields';
import SolidDateKanbanField from './SolidDateKanbanField';
import SolidDatetimeKanbanField from './SolidDatetimeKanbanField';
import SolidIntKanbanField from './SolidIntKanbanField';
import SolidShortTextKanbanField from './SolidShortTextKanbanField';

const SolidComputedKanbanField = ({ solidKanbanViewMetaData, fieldMetadata, fieldLayout,data }: SolidKanbanViewFieldsParams) => {
    if (['text', 'string'].includes(fieldMetadata.computedFieldValueType)) {
        return SolidShortTextKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout,data });
    }
    if (['int', 'decimal'].includes(fieldMetadata.computedFieldValueType)) {
        return SolidIntKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout,data });
    }
    if (fieldMetadata.computedFieldValueType === 'date') {
        return SolidDateKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout,data });
    }
    if (fieldMetadata.computedFieldValueType === 'datetime') {
        return SolidDatetimeKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout,data });
    }
};

export default SolidComputedKanbanField;