
import { SolidKanbanViewFieldsParams } from '../SolidKanbanViewFields';
import SolidRelationManyToOneKanbanField from './relations/SolidRelationManyToOneKanbanField';

const SolidRelationKanbanField = ({ solidKanbanViewMetaData, fieldMetadata, fieldLayout,data }: SolidKanbanViewFieldsParams) => {
    if (fieldMetadata.relationType === 'many-to-one') {
        return SolidRelationManyToOneKanbanField({ solidKanbanViewMetaData, fieldMetadata, fieldLayout,data });
    }
    // TODO: Support one-to-many
    // TODO: Support many-to-many
};

export default SolidRelationKanbanField;