
import { SolidListViewColumnParams } from '../SolidListViewColumn';
import SolidShortTextColumn from './SolidShortTextColumn';

const SolidLongTextColumn = ({ solidListViewMetaData, fieldMetadata, column }: SolidListViewColumnParams) => {
    return SolidShortTextColumn({ solidListViewMetaData, fieldMetadata, column });
};

export default SolidLongTextColumn;