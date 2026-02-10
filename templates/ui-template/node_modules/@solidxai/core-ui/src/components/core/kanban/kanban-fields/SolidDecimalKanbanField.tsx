
import { SolidKanbanViewFieldsParams } from '../SolidKanbanViewFields';
import SolidIntKanbanField from './SolidIntKanbanField';

const SolidDecimalKanbanField = ({ solidKanbanViewMetaData, fieldMetadata, fieldLayout,data }: SolidKanbanViewFieldsParams) => {
    return SolidIntKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout,data });
};

export default SolidDecimalKanbanField;