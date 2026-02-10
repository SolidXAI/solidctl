
import { useState } from 'react';
import { SolidKanbanViewFieldsParams } from '../SolidKanbanViewFields';
import { Dialog } from 'primereact/dialog';
import { Document, Page } from "react-pdf";
import { PDFSvg } from '../../../../components/Svg/PDFSvg';
import MP3Image from '../../../../resources/images/fileTypes/Mp3.png'
import MP4Image from '../../../../resources/images/fileTypes/Mp4.png'
import FileImage from '../../../../resources/images/fileTypes/File.png'
import Image from "../../../common/Image";
import { ExcelSvg } from '../../../../components/Svg/ExcelSvg';
const SolidShortTextKanbanField = ({ solidKanbanViewMetaData, fieldMetadata, fieldLayout, data, setLightboxUrls, setOpenLightbox, groupedView }: SolidKanbanViewFieldsParams) => {
    const [visible, setVisible] = useState(false);
    const widget = fieldLayout?.attrs?.widget ? fieldLayout?.attrs?.widget : "text";
    const mimeType = data && data?.mimeType
    const fileName = data?.originalFileName;
    const PDFHeader = () => {
        return (
            <div className='flex justify-content-between align-items-center'>
                <p className='m-0'>
                    {fileName}
                </p>
                <a
                    href={data[fieldMetadata.name]}
                    download={fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className='mr-4'
                >
                    <i className='pi pi-download' />
                </a>
            </div>
        )
    }
    return (
        <div className={`${fieldLayout?.attrs?.className ? ` ${fieldLayout.attrs.className}` : ""}`}>
            {widget === "text" && groupedView &&
                <p className='font-medium'>{fieldLayout?.attrs?.showLabel !== false && fieldLayout?.attrs?.label ? `${fieldLayout?.attrs?.label} : ` : ""}{data && data[fieldMetadata.name] ? `${data[fieldMetadata.name]}` : ""}</p>
            }
            {widget === "text" && !groupedView && fieldMetadata?.name === 'originalFileName' &&
                <p className='font-medium'>{fieldLayout?.attrs?.showLabel !== false && fieldLayout?.attrs?.label ? `${fieldLayout?.attrs?.label} : ` : ""}{data && data[fieldMetadata.name] ? `${data[fieldMetadata.name]}` : ""}</p>
            }
            {widget === "text" && !groupedView && fieldMetadata?.name === 'mimeType' &&
                <span className='solid-mimetype-chip'>{fieldLayout?.attrs?.showLabel !== false && fieldLayout?.attrs?.label ? `${fieldLayout?.attrs?.label} : ` : ""}{data && data[fieldMetadata.name] ? `${data[fieldMetadata.name]}` : ""}</span>
            }
            {widget === "image" && !groupedView && mimeType && mimeType.includes("image/") &&
                < div className='mt-3'>
                    <img
                        src={data[fieldMetadata.name]}
                        onClick={(event) => {
                            event.stopPropagation();
                            setLightboxUrls([{ src: data[fieldMetadata.name] }]);
                            setOpenLightbox(true);
                        }}
                        className={`${!groupedView ? 'kanban-media-image-preview' : 'kanban-image-preview'}`}
                    ></img>
                </div>
            }
            {widget === "image" && !groupedView && mimeType && mimeType.includes("pdf") && (
                <div className='mt-3' onClick={(e) => e.stopPropagation()}>
                    <div className='kanban-media-view-card' onClick={() => setVisible(true)} style={{ cursor: 'pointer' }}>
                        <PDFSvg />
                    </div>
                    <Dialog header={<PDFHeader />} visible={visible} style={{ width: "" }} onHide={() => setVisible(false)} modal>
                        <Document file={data[fieldMetadata.name]}>
                            <Page pageNumber={1} />
                        </Document>
                    </Dialog>
                </div>
            )}

            {widget === "image" && !groupedView && mimeType && (mimeType.includes("excel") || mimeType.includes("spreadsheet")) && (
                <a href={data[fieldMetadata.name]} className='kanban-media-view-card mt-3' onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer' }} download target="_blank" rel="noopener noreferrer">
                    <ExcelSvg />
                </a>
            )}
            {widget === "image" && !groupedView && mimeType && mimeType.includes("audio") && (
                <a href={data[fieldMetadata.name]} className='kanban-media-view-card my-2' onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer' }} download target="_blank" rel="noopener noreferrer">
                    <Image
                        src={MP3Image}
                        alt={fileName}
                        className="relative"
                        height={80}
                        width={80}
                    />
                </a>
            )}
            {widget === "image" && !groupedView && mimeType && mimeType.includes("video") && (
                <a href={data[fieldMetadata.name]} className='kanban-media-view-card mt-3' onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer' }} download target="_blank" rel="noopener noreferrer">
                    <Image
                        src={MP4Image}
                        alt={fileName}
                        className="relative"
                        height={80}
                        width={80}
                    />
                </a>
            )}

            {widget === "image" && !groupedView && mimeType && !mimeType.includes("image/") &&
                !mimeType.includes("pdf") &&
                !mimeType.includes("excel") &&
                !mimeType.includes("spreadsheet") &&
                !mimeType.includes("audio") &&
                !mimeType.includes("video") && (
                    <a href={data[fieldMetadata.name]} className='kanban-media-view-card mt-3' onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer' }} download target="_blank" rel="noopener noreferrer">
                        <Image
                            src={FileImage}
                            alt={fileName}
                            className="relative"
                            height={80}
                            width={80}
                        />
                    </a>
                )}
        </div>
    );

};

export default SolidShortTextKanbanField;
