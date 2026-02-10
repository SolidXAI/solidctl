import { SolidListFieldWidgetProps } from "../../../../types/solid-core";
import { AvatarWidget } from '../../../../components/core/common/AvatarWidget';

export const SolidManyToOneRelationAvatarListWidget = ({ rowData, solidListViewMetaData, fieldMetadata, column }: SolidListFieldWidgetProps) => {
    const manyToOneFieldData = rowData[column.attrs.name];

    // This is the userkey that will be present within the rowData.
    if (manyToOneFieldData) {
        // Since this is a many-to-one field, we fetch the user key field of the associated model.
        const userKeyField = fieldMetadata?.relationModel?.userKeyField?.name;

        const manyToManyColVal = [manyToOneFieldData[userKeyField]];

        // TODO: change this to use an anchor tag so that on click we open that entity form view. 
        return (
            <>
                {manyToManyColVal.length > 0 &&

                    manyToManyColVal.map((m: any) =>
                        <AvatarWidget value={m}></AvatarWidget>

                    )
                }
            </>
        )
    }
    else {
        return <span></span>
    }
};
