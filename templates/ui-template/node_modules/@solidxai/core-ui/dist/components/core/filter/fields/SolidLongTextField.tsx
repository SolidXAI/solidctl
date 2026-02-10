
import { SolidFilterFieldsParams } from '../SolidFilterFields';
import SolidShortTextField from './SolidShortTextField';

const SolidLongTextField = ({ fieldMetadata, onChange, index, rule }: SolidFilterFieldsParams) => {
    return SolidShortTextField({ fieldMetadata, onChange, index, rule });
};

export default SolidLongTextField;