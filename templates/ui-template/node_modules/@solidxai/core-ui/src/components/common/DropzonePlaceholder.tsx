

import { Button } from "primereact/button";
interface DropzonePlaceholderProps {
    mediaTypes?: string[];
    mediaMaxSizeKb?: number;
}

export const DropzonePlaceholder = ({ mediaTypes, mediaMaxSizeKb }: DropzonePlaceholderProps) => {
    const supportedFormats = mediaTypes?.length
        ? mediaTypes.map(type => type.toUpperCase()).join(", ")
        : "PDF, JPEG | File";

    // Convert max size from KB to MB and ensure it's at least 1MB
    const maxSizeMB = mediaMaxSizeKb ? (mediaMaxSizeKb / 1024).toFixed(1) : "10";

    return (
        <div className='solid-dropzone'>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M11 16V7.85L8.4 10.45L7 9L12 4L17 9L15.6 10.45L13 7.85V16H11ZM6 20C5.45 20 4.97917 19.8042 4.5875 19.4125C4.19583 19.0208 4 18.55 4 18V15H6V18H18V15H20V18C20 18.55 19.8042 19.0208 19.4125 19.4125C19.0208 19.8042 18.55 20 18 20H6Z" fill="#666666" />
            </svg>
            <div className='font-bold mt-2 text-center'>
                Drag and Drop or <span className='text-primary'> choose files</span> to upload
            </div>
            <p>Supported format: {supportedFormats} | Max size: {maxSizeMB} MB</p>
            <div>
                <Button outlined size='small' severity='secondary' label='Click to Browse' type="button" />
            </div>
        </div>
    )
}