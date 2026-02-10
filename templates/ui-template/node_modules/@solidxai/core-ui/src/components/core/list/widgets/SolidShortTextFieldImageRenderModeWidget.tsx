import { SolidMediaListFieldWidgetProps } from "../../../../types/solid-core";

export const SolidShortTextFieldImageListWidget = ({ rowData, solidListViewMetaData, fieldMetadata, column, setLightboxUrls, setOpenLightbox }: SolidMediaListFieldWidgetProps) => {

    return (
        <img
            src={rowData[fieldMetadata.name]}
            alt="product-image-single"
            className="shadow-2 border-round"
            width={40}
            height={40}
            style={{ objectFit: "cover" }}
            onClick={(event) => {
                event.stopPropagation();
                setLightboxUrls([{ src: rowData[fieldMetadata.name], downloadUrl: rowData[fieldMetadata.name] }]);
                setOpenLightbox(true);
            }}
        />
    );
};

