
import { SolidListViewColumnParams } from '../SolidListViewColumn';
import SolidShortTextColumn from './SolidShortTextColumn';

const SolidRichTextColumn = ({ solidListViewMetaData, fieldMetadata, column }: SolidListViewColumnParams) => {
    return SolidShortTextColumn({ solidListViewMetaData, fieldMetadata, column });
};

export default SolidRichTextColumn;