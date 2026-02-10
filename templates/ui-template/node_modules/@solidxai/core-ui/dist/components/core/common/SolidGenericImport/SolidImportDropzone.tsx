
import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from 'primereact/button'
import styles from './SolidImport.module.css'
import { DocumentSvg } from './DocumentSvg';
import { useCreateImportTransactionMutation } from '../../../../redux/api/importTransactionApi';
import { Toast } from 'primereact/toast';
import { ERROR_MESSAGES } from '../../../../constants/error-messages';
import showToast from "../../../../helpers/showToast";
export const SolidImportDropzone = ({ setImportStep, setTransactionId, modelMetadataId }: any) => {
    const toast = useRef<Toast>(null);

    const [file, setFile] = useState<File | null>(null);
    const [createImportTransaction, { isLoading }] = useCreateImportTransactionMutation();


    const uploadFile = async (uploadFile: File) => {
        const formData = new FormData();
        formData.append('fileLocation', uploadFile);
        formData.append('modelMetadataId', modelMetadataId);

        try {
            const response = await createImportTransaction(formData).unwrap();
            console.log('Upload success:', response);
            if (response?.statusCode === 200) {
                setFile(uploadFile);
                showToast(toast, "success", ERROR_MESSAGES.FILE_UPLOAD, ERROR_MESSAGES.FILE_UPLOAD_SUCCESSFULLY);
                setTransactionId?.(response?.data?.id);
            } else {
                showToast(toast, "error", ERROR_MESSAGES.FAILED, ERROR_MESSAGES.FAILED_UPLOAD_FILE)
            }
        } catch (error) {
            console.error(ERROR_MESSAGES.FAILED_UPLOAD_FILE, error);
            showToast(toast, "error", ERROR_MESSAGES.FAILED, ERROR_MESSAGES.FAILED_UPLOAD_FILE)
        }
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const selectedFile = acceptedFiles[0];
            uploadFile(selectedFile); // 👈 Auto upload on drop
        }
    }, []);

    const { getRootProps, getInputProps, open } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'text/csv': ['.csv']
        },
        multiple: false,
    });

    const removeFile = () => {
        setFile(null);
    };

    const formatBytes = (bytes: number) => {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Byte';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };

    return (
        <div>
            <Toast ref={toast} />
            <div className={styles.SolidImportContextWrapper}>
                <div {...getRootProps({ className: styles.dropzone })} className='h-full flex flex-column align-items-center justify-content-center'>
                    <input {...getInputProps()} />
                    {/* {!file ? ( */}
                    <div className={""}>
                        <div className='flex justify-content-center'>
                            <DocumentSvg />
                        </div>
                        <h5 className='text-center solid-primary-black-text'>Drop or upload a file to import</h5>
                        <p className='text-center m-0'>Excel files are recommended as formatting is automatic.<br />
                            But, you can also use .csv files</p>
                        <div className='flex justify-content-center mt-3'>
                            <Button label="Click to browse" size="small" severity='secondary' outlined />
                        </div>
                    </div>
                    {/* ) : ( */}
                    {file &&
                        <div className="flex align-items-start justify-content-between gap-3 p-3 mt-4 w-full md:w-8" style={{ border: '1px solid var(--primary-light-color)', borderRadius: 6 }} onClick={(e) => e.stopPropagation()}>
                            <div>
                                <p className='m-0'><strong>File:</strong> {file.name}</p>
                                <p className='m-0'><strong>Type:</strong> {file.type || 'Unknown'}</p>
                                <p className='m-0'><strong>Size:</strong> {formatBytes(file.size)}</p>
                            </div>
                            <div>
                                <Button size="small" icon="pi pi-trash" text onClick={removeFile} />
                            </div>
                        </div>
                    }
                    {/* )} */}
                </div>
            </div>
            <div className='mt-3 flex align-items-center gap-3'>
                <Button
                    label='Continue'
                    size='small'
                    onClick={() => {
                        if (!file) {
                            showToast(toast, "error", ERROR_MESSAGES.MISSING_FILE, ERROR_MESSAGES.FAILED_UPLOAD_FILE);
                            return;
                        }
                        setImportStep(3);
                    }}
                    disabled={!file}
                />
            </div>
        </div>
    )
}