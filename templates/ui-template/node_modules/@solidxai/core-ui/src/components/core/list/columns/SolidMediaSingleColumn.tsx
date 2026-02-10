
import React, { useState } from 'react';
import { Column } from "primereact/column";
import { SolidListViewColumnParams } from '../SolidListViewColumn';
import { classNames } from 'primereact/utils';
import { SolidMediaListFieldWidgetProps } from '../../../../types/solid-core';
import { getExtensionComponent } from '../../../../helpers/registry';

// Helpers for file type detection
const isImageFile = (url: string) => /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url);
const isVideoFile = (url: string) => /\.(mp4|webm|ogg)$/i.test(url);
const isAudioFile = (url: string) => /\.(mp3|wav|ogg)$/i.test(url);

// Extensions that should be downloaded directly
const downloadOnlyExt = [
    "txt", "zip", "rar",
    "doc", "docx",
    "xls", "xlsx",
    "ppt", "pptx",
    "pdf"
];

// Media component with fallback for broken links
const MediaWithFallback = ({ src, alt, onClick }: { src: string; alt: string; onClick: (event: React.MouseEvent) => void }) => {
    const [isBroken, setIsBroken] = useState(false);

    const handleClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        const cleanUrl = src.split("?")[0];
        const ext = cleanUrl.split(".").pop()?.toLowerCase();

        if (ext && downloadOnlyExt.includes(ext)) {
            // Trigger download for docs/archives
            const link = document.createElement("a");
            link.href = src;
            link.download = "";
            link.target = "_blank";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            onClick(event);
        }
    };

    if (!isBroken) {
        if (isImageFile(src)) {
            return (
                <img
                    src={src}
                    alt={alt}
                    className="shadow-2 border-round"
                    width={40}
                    height={40}
                    style={{ objectFit: "cover", cursor: "pointer" }}
                    onError={() => setIsBroken(true)}
                    onClick={handleClick}
                />
            );
        }

        if (isVideoFile(src)) {
            return (
                <video
                    src={src}
                    width={40}
                    height={40}
                    className="shadow-2 border-round"
                    style={{ objectFit: "cover", cursor: "pointer" }}
                    onError={() => setIsBroken(true)}
                    onClick={handleClick}
                    muted
                />
            );
        }

        if (isAudioFile(src)) {
            return (
                <div
                    className="shadow-2 border-round flex align-items-center justify-content-center bg-gray-100"
                    style={{ width: 40, height: 40, cursor: "pointer" }}
                    onClick={handleClick}
                >
                    <i className="pi pi-volume-up text-xl text-gray-600"></i>
                </div>
            );
        }
    }

    // fallback icon (docs/others)
    return (
        <div
            style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            onClick={handleClick}
        >
            <i className={classNames("pi pi-file", "text-3xl text-gray-400")}></i>
        </div>
    );
};

// Main column renderer
const SolidMediaSingleColumn = ({ solidListViewMetaData, fieldMetadata, column, setLightboxUrls, setOpenLightbox }: SolidListViewColumnParams) => {
    const header = column.attrs.label ?? fieldMetadata.displayName;

    return (
        <Column
            key={fieldMetadata.name}
            field={fieldMetadata.name}
            header={header}
            body={(rowData) => {
                let viewWidget = column.attrs.viewWidget;
                if (!viewWidget) {
                    viewWidget = 'DefaultMediaSingleListWidget';
                }
                let DynamicWidget = getExtensionComponent(viewWidget);
                const widgetProps: SolidMediaListFieldWidgetProps = {
                    rowData,
                    solidListViewMetaData,
                    fieldMetadata,
                    column,
                    setLightboxUrls,
                    setOpenLightbox
                }
                return (
                    <>
                        {DynamicWidget && <DynamicWidget {...widgetProps} />}
                    </>
                )
            }}
            sortable={column.attrs.sortable}
            showFilterOperator={false}
            filterPlaceholder={`Search by ${fieldMetadata.displayName}`}
            style={{ minWidth: "12rem" }}
            headerClassName="table-header-fs"
        />
    );
};

export default SolidMediaSingleColumn;

// Default widget for single media field
export const DefaultMediaSingleListWidget = ({
    rowData,
    solidListViewMetaData,
    fieldMetadata,
    column,
    setLightboxUrls,
    setOpenLightbox
}: SolidMediaListFieldWidgetProps) => {
    if (!rowData?._media?.[fieldMetadata.name]) return null;
    const mediaUrls = rowData._media[fieldMetadata.name].map((i: any) => i._full_url);

    const firstUrl = mediaUrls[0];
    if (!firstUrl) return <div style={{ height: 40, width: 40 }} />;

    return (
        <MediaWithFallback
            src={firstUrl}
            alt="media"
            onClick={(event) => {
                // Only open lightbox for image, video, or audio
                event.stopPropagation()
                if (isImageFile(firstUrl) || isVideoFile(firstUrl) || isAudioFile(firstUrl)) {
                    setLightboxUrls([{ src: firstUrl, downloadUrl: firstUrl }]);
                    setOpenLightbox(true);
                }
            }}
        />
    );
};
