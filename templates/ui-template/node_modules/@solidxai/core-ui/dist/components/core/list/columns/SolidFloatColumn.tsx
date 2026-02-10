
import { SolidListViewColumnParams } from '../SolidListViewColumn';
import SolidIntColumn from './SolidIntColumn';

const SolidFloatColumn = ({ solidListViewMetaData, fieldMetadata, column }: SolidListViewColumnParams) => {
    return SolidIntColumn({ solidListViewMetaData, fieldMetadata, column });
};

export default SolidFloatColumn;