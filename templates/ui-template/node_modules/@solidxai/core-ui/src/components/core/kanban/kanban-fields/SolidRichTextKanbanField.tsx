
import { SolidKanbanViewFieldsParams } from '../SolidKanbanViewFields';
import SolidShortTextKanbanField from './SolidShortTextKanbanField';

const SolidRichTextKanbanField = ({ solidKanbanViewMetaData, fieldMetadata, fieldLayout,data }: SolidKanbanViewFieldsParams) => {
    return SolidShortTextKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout,data });
};

export default SolidRichTextKanbanField;