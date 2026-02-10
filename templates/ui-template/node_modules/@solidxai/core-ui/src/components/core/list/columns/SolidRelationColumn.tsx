
import { SolidListViewColumnParams } from '../SolidListViewColumn';
import SolidRelationManyToManyColumn from './relations/SolidRelationManyToManyColumn';
import SolidRelationManyToOneColumn from './relations/SolidRelationManyToOneColumn';
import SolidRelationOneToManyColumn from './relations/SolidRelationOneToManyColumn';

const SolidRelationColumn = ({ solidListViewMetaData, fieldMetadata, column }: SolidListViewColumnParams) => {
    if (fieldMetadata.relationType === 'many-to-one') {
        return SolidRelationManyToOneColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.relationType === 'one-to-many') {
        return SolidRelationOneToManyColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.relationType === 'many-to-many') {
        return SolidRelationManyToManyColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    // TODO: Support one-to-many
    // TODO: Support many-to-many
};

export default SolidRelationColumn;