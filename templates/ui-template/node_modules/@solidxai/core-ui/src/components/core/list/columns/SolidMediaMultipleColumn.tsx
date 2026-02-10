
import React, { useState } from 'react';
import { Column } from "primereact/column";
import { SolidListViewColumnParams } from '../SolidListViewColumn';
import { Button } from 'primereact/button';
import { SolidMediaListFieldWidgetProps } from '../../../../types/solid-core';
import { getExtensionComponent } from '../../../../helpers/registry';
import { classNames } from 'primereact/utils';
import { FileReaderExt } from '../../../../components/common/FileReaderExt';
import { Dialog } from 'primereact/dialog';

// Helpers
const isImageFile = (url: string) => /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url);
const isVideoFile = (url: string) => /\.(mp4|webm|ogg)$/i.test(url);
const isAudioFile = (url: string) => /\.(mp3|wav|ogg)$/i.test(url);

const downloadOnlyExt = [
    "txt", "zip", "rar",
    "doc", "docx",
    "xls", "xlsx",
    "ppt", "pptx",
    "pdf", "csv"
];

const isDocumentType = (url: string) => {
    const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
    return ext ? downloadOnlyExt.includes(ext) : false;
};

const downloadFile = (url: string, name: string = "") => {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};



// Thumbnail preview component
const MediaPreview = ({ src, onClick }: { src: string; onClick: (event: React.MouseEvent) => void }) => {
    const [isBroken, setIsBroken] = useState(false);

    const handleClick = (event: React.MouseEvent) => {
        onClick(event);
    };

    if (!isBroken) {
        if (isImageFile(src)) {
            return (
                <img
                    src={src}
                    alt="media"
                    className="shadow-2 border-round"
                    width={40}
                    height={40}
                    style={{ objectFit: "cover" }}
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
                    style={{ objectFit: "cover" }}
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
                    style={{ width: 40, height: 40 }}
                    onClick={handleClick}
                >
                    <i className="pi pi-volume-up text-xl text-gray-600"></i>
                </div>
            );
        }
    }

    return (
        <div
            style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={handleClick}
        >
            <i className={classNames("pi pi-file", "text-3xl text-gray-400")}></i>
        </div>
    );
};


// Column Component
const SolidMediaMultipleColumn = ({ solidListViewMetaData, fieldMetadata, column, setLightboxUrls, setOpenLightbox }: SolidListViewColumnParams) => {
    const filterable = false;
    const showFilterOperator = false;
    const columnDataType = undefined;
    const header = column.attrs.label ?? fieldMetadata.displayName;

    return (
        <Column
            key={fieldMetadata.name}
            field={fieldMetadata.name}
            header={header}
            body={(rowData) => {
                let viewWidget = column.attrs.viewWidget;
                if (!viewWidget) {
                    viewWidget = 'DefaultMediaMultipleListWidget';
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
                        {
                            DynamicWidget && <DynamicWidget {...widgetProps} />
                        }
                    </>
                )
            }}
            sortable={column.attrs.sortable}
            dataType={columnDataType}
            showFilterOperator={showFilterOperator}
            filterPlaceholder={`Search by ${fieldMetadata.displayName}`}
            style={{ minWidth: "12rem" }}
            headerClassName="table-header-fs"
        />
    );
};

export default SolidMediaMultipleColumn;

// Default multiple widget
export const DefaultMediaMultipleListWidget = ({ rowData, fieldMetadata, setLightboxUrls, setOpenLightbox }: SolidMediaListFieldWidgetProps) => {
    const [isShowAllFiles, setShowAllFiles] = useState(false);

    if (!rowData?._media?.[fieldMetadata.name]) return null;

    const fullrecord = rowData._media[fieldMetadata.name]?.map((file: any) => ({
        name: file.originalFileName,
        type: file.mimeType,
        size: file.fileSize,
        id: file.id,
        fileUrl: file._full_url
    }));


    const formatFileSize = (size: number) =>
        size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${(size / 1024).toFixed(1)} KB`;


    const handleFileView = (file: any) => {
        const fileUrl = file?.fileUrl || "";
        const cleanUrl = fileUrl.split("?")[0];
        const ext = cleanUrl.split(".").pop()?.toLowerCase();

        if (ext && downloadOnlyExt.includes(ext)) {
            downloadFile(file?.fileUrl, "")

        } else {
            setLightboxUrls?.([{ src: file.fileUrl, downloadUrl: file.fileUrl }]);
            setOpenLightbox?.(true);
        }
    };



    return fullrecord.length > 0 ? (
        <div className='flex gap-2 align-items-end'>

            {/* THUMBNAIL - FIXED BEHAVIOR */}
            <MediaPreview
                src={fullrecord[0]?.fileUrl}
                onClick={(event) => {
                    event.stopPropagation();

                    const cleanUrl = fullrecord[0]?.fileUrl.split("?")[0];
                    const ext = cleanUrl.split(".").pop()?.toLowerCase();

                    if (ext && downloadOnlyExt.includes(ext) && fullrecord?.length > 1) {
                        setShowAllFiles(true)
                        return;
                    }

                    else if (ext && downloadOnlyExt.includes(ext)) {
                        downloadFile(fullrecord[0]?.fileUrl, "")
                        return;
                    }

                    // FIRST FILE IS MEDIA ⇒ OPEN LIGHTBOX
                    const urlsWithType = fullrecord.map((file: any) => ({
                        src: file.fileUrl,
                        downloadUrl: file.fileUrl,
                    }));
                    setLightboxUrls(urlsWithType);
                    setOpenLightbox(true);
                }}
            />

                {fullrecord?.length > 1 && <span
                        style={{
                            color: "#0895CD",
                            fontWeight: "bold",
                            cursor: "pointer",
                            marginLeft: "4px"
                        }}
                        onClick={(event) => {
                            event.stopPropagation();
    
                            if (isDocumentType(fullrecord[0]?.fileUrl)) {
                                setShowAllFiles(true);
                            } else {
                                const urlsWithType = fullrecord.map((file: any) => ({
                                    src: file.fileUrl,
                                    downloadUrl: file.fileUrl
                                }));
                                setLightboxUrls(urlsWithType);
                                setOpenLightbox(true);
                            }
                        }}
                    >
                        +{fullrecord.length - 1}
                   </span>
                }

             

            {/* VIEW ALL DIALOG */}
            <Dialog
                visible={isShowAllFiles}
                header="Items Uploaded"
                modal
                onHide={() => setShowAllFiles(false)}
                // style={{ minWidth: 450 }}
                style={{ width: '32rem' }}
                onClick={(event) => event.stopPropagation()}
                breakpoints={{ '591px': '94vw'}}
            >
                {fullrecord?.map((file: any) => {
                    const fileId = `${file.name}-${file.size}`;
                    return (
                        <div key={fileId} className="solid-file-upload-wrapper mb-3">
                            <div className="flex align-items-center gap-2">

                                <FileReaderExt fileDetails={file} />

                                <div className="w-full flex flex-column gap-1">
                                    <div className="flex align-items-center justify-content-between">

                                        <p
                                            className="font-normal w-11 text-primary m-0"
                                            style={{ cursor: "pointer" }}
                                            onClick={() => handleFileView(file)}
                                        >
                                            {file?.name}
                                        </p>

                                        <Button
                                            type="button"
                                            text
                                            icon="pi pi-download"
                                            size="small"
                                            onClick={() => {
                                                downloadFile(file?.fileUrl, "")
                                            }}
                                            style={{ height: 16, width: 16 }}
                                        />
                                    </div>

                                    <div className="text-sm">{formatFileSize(file.size)}</div>
                                </div>

                            </div>
                        </div>
                    )
                }
                )}
            </Dialog>
        </div>
    ) : (
        <div style={{ height: 40, width: 40 }} />
    );
};
