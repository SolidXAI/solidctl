import { SolidListFieldWidgetProps } from "../../../../types/solid-core";
import { AvatarWidget } from '../../../../components/core/common/AvatarWidget';


export const SolidManyToManyRelationAvatarListWidget = ({ rowData, solidListViewMetaData, fieldMetadata, column }: SolidListFieldWidgetProps) => {
    const manyToManyFieldData = rowData[column.attrs.name];

    // This is the userkey that will be present within the rowData.
    if (manyToManyFieldData) {
        // Since this is a many-to-one field, we fetch the user key field of the associated model.
        const userKeyField = fieldMetadata?.relationModel?.userKeyField?.name;

        const manyToManyColVal = manyToManyFieldData.map((f: any) => f[userKeyField]);

        // TODO: change this to use an anchor tag so that on click we open that entity form view. 
        return (
            <>
                {manyToManyColVal.length > 0 &&
                    <div className="flex align-items-center gap-2">
                        <AvatarWidget value={manyToManyColVal[0]}></AvatarWidget>
                        <span style={{ color: "#0895CD", fontWeight: 'bold' }}>{manyToManyColVal.length - 1 > 0 ? ` +${manyToManyColVal.length - 1}` : ""}</span>
                    </div>
                }
            </>
        )
    }
    else {
        return <span></span>
    }
};
