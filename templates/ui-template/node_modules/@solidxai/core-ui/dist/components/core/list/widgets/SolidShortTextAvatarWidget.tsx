import { SolidListFieldWidgetProps } from "../../../../types/solid-core";


export const SolidShortTextAvatarWidget = ({ rowData, solidListViewMetaData, fieldMetadata, column }: SolidListFieldWidgetProps) => {
    // use "widget": "SolidUserNameAvatarWidget" in the list view field 

    const value =
        fieldMetadata &&
        fieldMetadata.name &&
        fieldMetadata.type === 'relation' &&
        column?.attrs?.initialsKey &&
        rowData[fieldMetadata.name]
            ? rowData[fieldMetadata.name][column.attrs.initialsKey]
            : fieldMetadata && fieldMetadata.name
                ? rowData[fieldMetadata.name]
                : undefined;

    const getInitials = (value: string) => {
        if (value) {
            const names = value?.trim().split(' ');
            const initials =
                names.length === 1
                    ? names[0][0]
                    : names[0][0] + names[names.length - 1][0];
            return initials.toUpperCase();
        } else {
            return ""
        }
    };

    const getColorFromInitials = (initials: string) => {
        let hash = 0;
        for (let i = 0; i < initials.length; i++) {
            hash = initials.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 60%, 60%)`; // nice pastel color
    };

    const initials = getInitials(value);
    const bgColor = getColorFromInitials(initials);

    return (
        <div className="solid-table-row">
            {value &&
                < div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                        style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            backgroundColor: bgColor,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: 12,
                        }}
                    >
                        {initials}
                    </div>
                    <span>{value}</span>
                </div>
            }

        </div >
    );
};

