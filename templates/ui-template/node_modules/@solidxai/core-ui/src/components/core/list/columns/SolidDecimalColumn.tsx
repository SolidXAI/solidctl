
import { SolidListViewColumnParams } from '../SolidListViewColumn';
import SolidIntColumn from './SolidIntColumn';

const SolidDecimalColumn = ({ solidListViewMetaData, fieldMetadata, column }: SolidListViewColumnParams) => {
    return SolidIntColumn({ solidListViewMetaData, fieldMetadata, column });
};

export default SolidDecimalColumn;