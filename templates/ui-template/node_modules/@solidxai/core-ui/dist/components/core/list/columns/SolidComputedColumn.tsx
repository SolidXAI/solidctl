
import { SolidListViewColumnParams } from '../SolidListViewColumn';
import SolidBooleanColumn from './SolidBooleanColumn';
import SolidDateColumn from './SolidDateColumn';
import SolidDatetimeColumn from './SolidDatetimeColumn';
import SolidIntColumn from './SolidIntColumn';
import SolidShortTextColumn from './SolidShortTextColumn';

const SolidComputedColumn = ({ solidListViewMetaData, fieldMetadata, column }: SolidListViewColumnParams) => {
    if (['text', 'string'].includes(fieldMetadata.computedFieldValueType)) {
        return SolidShortTextColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (['int', 'decimal'].includes(fieldMetadata.computedFieldValueType)) {
        return SolidIntColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.computedFieldValueType === 'date') {
        return SolidDateColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.computedFieldValueType === 'datetime') {
        return SolidDatetimeColumn({ solidListViewMetaData, fieldMetadata, column });
    }
    if (fieldMetadata.computedFieldValueType === 'boolean') {
        return SolidBooleanColumn({ solidListViewMetaData, fieldMetadata, column });
    }
};

export default SolidComputedColumn;
