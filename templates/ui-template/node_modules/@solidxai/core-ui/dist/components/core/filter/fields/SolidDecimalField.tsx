
import { SolidFilterFieldsParams } from '../SolidFilterFields';
import SolidIntField from './SolidIntField';

const SolidDecimalField = ({ fieldMetadata, onChange, index, rule }: SolidFilterFieldsParams) => {
    return SolidIntField({ fieldMetadata, onChange, index, rule });
};

export default SolidDecimalField;