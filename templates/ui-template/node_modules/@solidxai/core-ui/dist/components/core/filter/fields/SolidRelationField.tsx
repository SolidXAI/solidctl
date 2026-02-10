
import { SolidFilterFieldsParams } from '../SolidFilterFields';
import SolidRelationManyToManyField from './relations/SolidRelationManyToManyField';
import SolidRelationManyToOneField from './relations/SolidRelationManyToOneField';

const SolidRelationField = ({ fieldMetadata, onChange, index, rule }: SolidFilterFieldsParams) => {
    if (fieldMetadata.relationType === 'many-to-one') {
        return SolidRelationManyToOneField({ fieldMetadata, onChange, index, rule });
    }
    if (fieldMetadata.relationType === 'many-to-many') {
        return SolidRelationManyToManyField({ fieldMetadata, onChange, index, rule });
    }
    // TODO: Support one-to-many
    // TODO: Support many-to-many
};

export default SolidRelationField;