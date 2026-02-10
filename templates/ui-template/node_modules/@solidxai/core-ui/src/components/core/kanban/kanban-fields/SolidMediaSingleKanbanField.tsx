
import React, { useState } from 'react';
import { Column, ColumnFilterElementTemplateOptions } from "primereact/column";
import { InputTypes, SolidVarInputsFilterElement } from "../SolidVarInputsFilterElement";
import { SolidKanbanViewFieldsParams } from '../SolidKanbanViewFields';
import { FormEvent } from "primereact/ts-helpers";
import { FilterMatchMode } from 'primereact/api';
import { Document, Page, pdfjs } from "react-pdf";
import { Dialog } from "primereact/dialog";
import { PDFSvg } from '../../../../components/Svg/PDFSvg';
import Image from "../../../common/Image";
import FileImage from '../../../../resources/images/fileTypes/File.png'
import { ExcelSvg } from '../../../../components/Svg/ExcelSvg';
import MP3Image from '../../../../resources/images/fileTypes/Mp3.png'
import MP4Image from '../../../../resources/images/fileTypes/Mp4.png'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;


const SolidMediaSingleKanbanField = ({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data, setLightboxUrls, setOpenLightbox }: SolidKanbanViewFieldsParams) => {
    const [visible, setVisible] = useState(false);
    const header = fieldMetadata.displayName;
    const url = data && data._media && data._media[fieldMetadata.name].length > 0 && data._media[fieldMetadata.name].map((i: any) => i._full_url)[0];
    const mimeType = data && data._media && data._media[fieldMetadata.name].length > 0 && data._media[fieldMetadata.name].map((i: any) => i.mimeType)[0];
    const fileName = data && data._media && data._media[fieldMetadata.name][0]?.originalFileName
    // const mimeType: string = "excel";
    // const url = "http://localhost:8080/media-files-storage/Holiday List 2025.pdf";
    // const url = "http://localhost:8080/media-files-storage/PF Form.xls";


    return (
        <div className={`${fieldLayout?.attrs?.className ? ` ${fieldLayout.attrs.className}` : ""}`}>

            {mimeType && mimeType.includes("image/") &&
                <div className='my-2'>
                    <img className={fieldLayout?.attrs?.kanbanImagePreviewClassname ? fieldLayout?.attrs?.kanbanImagePreviewClassname : 'kanban-image-preview'}

                        src={url}
                        onClick={(event) => {
                            event.stopPropagation();
                            setLightboxUrls([{ src: url }]);
                            setOpenLightbox(true);
                        }}
                        alt={header}
                    />
                    {fieldLayout?.attrs.showLabel !== false &&

                        <p className="text-sm" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                            onClick={(event) => {
                                event.stopPropagation();
                                setLightboxUrls([{ src: url }]);
                                setOpenLightbox(true);
                            }}
                        >
                            {fileName}
                        </p>
                    }

                </div>
            }
            {/* Render PDF - Open Lightbox on Click */}
            {mimeType && mimeType.includes("pdf") && (
                <div onClick={(e) => e.stopPropagation()}>
                    <div className='flex align-items-end gap-2 my-2'>
                        <div onClick={() => setVisible(true)} style={{ cursor: 'pointer' }}>
                            <PDFSvg size={50} />
                        </div>
                        <p className="text-sm" style={{ cursor: 'pointer', maxWidth: '70%', wordWrap: 'break-word', overflowWrap: 'break-word' }} onClick={() => setVisible(true)}>
                            {fileName}
                        </p>
                    </div>
                    <Dialog header={fileName} visible={visible} style={{ width: "" }} onHide={() => setVisible(false)} modal>
                        <Document file={url}>
                            <Page pageNumber={1} />
                        </Document>
                    </Dialog>
                </div>
            )}
            {/* Excel or Other Files - Show Download Icon */}
            {mimeType && (mimeType.includes("excel") || mimeType.includes("spreadsheet")) && (
                <div className='flex align-items-end gap-2 my-2' onClick={(e) => e.stopPropagation()}>
                    <a href={url} download target="_blank" rel="noopener noreferrer">
                        <ExcelSvg size={50} />
                    </a>
                    <a href={url} download target="_blank" rel="noopener noreferrer" className='text-color flex align-items-start gap-2' style={{ textDecoration: 'none' }}>
                        <p className="text-sm mb-1" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                            {fileName}
                        </p>
                        <span className='pi pi-cloud-download'></span>
                    </a>
                </div>
            )}

            {mimeType && mimeType.includes("audio") && (
                <div className='flex align-items-end gap-2 my-2' onClick={(e) => e.stopPropagation()}>
                    <a href={url} download target="_blank" rel="noopener noreferrer">
                        <Image
                            src={MP3Image}
                            alt={fileName}
                            className="relative"
                            height={50}
                            width={50}
                        />
                    </a>
                    <a href={url} download target="_blank" rel="noopener noreferrer" className='text-color flex align-items-start gap-2' style={{ textDecoration: 'none' }}>
                        <p className="text-sm mb-1" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                            {fileName}
                        </p>
                        <span className='pi pi-cloud-download'></span>
                    </a>
                </div>
            )}
            {mimeType && mimeType.includes("video") && (
                <div className='flex align-items-end gap-2 my-2' onClick={(e) => e.stopPropagation()}>
                    <a href={url} download target="_blank" rel="noopener noreferrer">
                        <Image
                            src={MP4Image}
                            alt={fileName}
                            className="relative"
                            height={50}
                            width={50}
                        />
                    </a>
                    <a href={url} download target="_blank" rel="noopener noreferrer" className='text-color flex align-items-start gap-2' style={{ textDecoration: 'none' }}>
                        <p className="text-sm mb-1" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                            {fileName}
                        </p>
                        <span className='pi pi-cloud-download'></span>
                    </a>
                </div>
            )}

            {mimeType &&
                !mimeType.includes("image/") &&
                !mimeType.includes("pdf") &&
                !mimeType.includes("excel") &&
                !mimeType.includes("spreadsheet") &&
                !mimeType.includes("audio") &&
                !mimeType.includes("video") && (
                    <div className='flex align-items-end gap-2 my-2' onClick={(e) => e.stopPropagation()}>
                        <a href={url} download target="_blank" rel="noopener noreferrer">
                            <Image
                                src={FileImage}
                                alt={fileName}
                                className="relative"
                                height={50}
                                width={50}
                            />
                        </a>
                        <a href={url} download target="_blank" rel="noopener noreferrer" className='text-color flex align-items-start gap-2' style={{ textDecoration: 'none' }}>
                            <p className="text-sm mb-1" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                {fileName}
                            </p>
                            <span className='pi pi-cloud-download'></span>
                        </a>
                    </div>
                )
            }
        </div>
    );

};

export default SolidMediaSingleKanbanField;
