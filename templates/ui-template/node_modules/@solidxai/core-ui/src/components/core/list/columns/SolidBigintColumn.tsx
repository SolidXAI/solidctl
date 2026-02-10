
import { SolidListViewColumnParams } from '../SolidListViewColumn';
import SolidIntColumn from './SolidIntColumn';

const SolidBigintColumn = ({ solidListViewMetaData, fieldMetadata, column }: SolidListViewColumnParams) => {
    return SolidIntColumn({ solidListViewMetaData, fieldMetadata, column });
};

export default SolidBigintColumn;