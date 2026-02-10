
import { SolidFilterFieldsParams } from '../SolidFilterFields';
import SolidShortTextField from './SolidShortTextField';

const SolidRichTextField = ({ fieldMetadata, onChange, index, rule }: SolidFilterFieldsParams) => {
    return SolidShortTextField({ fieldMetadata, onChange, index, rule });
};

export default SolidRichTextField;