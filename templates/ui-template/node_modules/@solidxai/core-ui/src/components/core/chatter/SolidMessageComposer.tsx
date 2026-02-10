import { InputText } from 'primereact/inputtext'
import styles from './chatter.module.css'
import { Button } from 'primereact/button'
import { useCreateChatterMessageMutation } from '../../../redux/api/solidChatterMessageApi'
import { useEffect, useState, useRef } from 'react'
import { ERROR_MESSAGES } from '../../../constants/error-messages'
import { useSession } from '../../../hooks/useSession'

export const SolidMessageComposer = ({ type, modelSingularName, refetch, id }: { type?: string, modelSingularName?: any, refetch?: any, id?: any }) => {
    const [message, setMessage] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const { data: session, status } = useSession();
    const user = session?.user;
    const fileInputRef = useRef<HTMLInputElement>(null);

    // const { data: viewLayoutData } = useGetSolidViewLayoutQuery(null);
    const [createChatterMessage, { isLoading, isSuccess, isError }] = useCreateChatterMessageMutation();

    const tempEmails = [
        "johndoe@gmal.com",
        "tempmail@gmail.com",
        "example@mail.com"
    ]

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const files = Array.from(event.target.files);
            setSelectedFiles(prev => [...prev, ...files]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() && selectedFiles.length === 0) return;

        try {
            const formData = new FormData();
            formData.append('messageType', "custom");
            formData.append('messageSubType', "custom");
            formData.append('messageBody', message);
            formData.append('coModelEntityId', id);
            formData.append('coModelName', modelSingularName);
            formData.append('userId', user?.id || 1);

            selectedFiles.forEach((file, index) => {
                formData.append(`messageAttachments`, file);
            });

            await createChatterMessage(formData).unwrap();
            setMessage('');
            setSelectedFiles([]);
        } catch (error) {
            console.error(ERROR_MESSAGES.FETCHING_MESSAGE, error);
        }
    };

    useEffect(() => {
        if (isSuccess) {
            refetch()
        }
    }, [isSuccess]);

    return (
        <form className={styles.chatterMessageComposer} onSubmit={handleSubmit}>
            {/* {type === 'email' &&
                <div className='flex align-items-center gap-1 text-sm mb-2'>
                    <span className='font-bold'>To:</span>
                    <div className={styles.chatterEmails}>
                        {tempEmails.map((mail, index) => (
                            <span key={index}>
                                {mail}
                            </span>
                        ))}
                    </div>
                    <div className={`pi pi-sort-down-fill text-primary ${styles.emailTooltipIcon}`} style={{ fontSize: 8 }}>
                        <div className={styles.emailsTooltip}>
                            {tempEmails.map((mail, index) => (
                                <span key={index} className='text-color text-sm'>
                                    {mail}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            } */}
            <div className='flex align-items-center gap-2'>
                <InputText
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={type === 'email' ? 'Send a message to followers' : 'Log an internal note.'}
                    className={`p-inputtext-sm w-full p-2 ${styles.chatterMessageInput}`}
                />
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    style={{ display: 'none' }}
                />
                <Button
                    icon="pi pi-plus"
                    className="p-button-rounded p-button-text"
                    onClick={() => fileInputRef.current?.click()}
                    tooltip="Attach files"
                    tooltipOptions={{ position: 'top' }}
                    type='button'
                />
            </div>
            {selectedFiles.length > 0 && (
                <div className='flex flex-wrap gap-2 mt-2'>
                    {selectedFiles.map((file, index) => (
                        <div key={index} className='flex align-items-center gap-2 bg-gray-100 p-2 rounded'>
                            <span className='text-sm'>{file.name}</span>
                            <Button
                                icon="pi pi-times"
                                className="p-button-rounded p-button-text p-button-sm"
                                onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                            />
                        </div>
                    ))}
                </div>
            )}
            <div className='mt-3 flex align-items-center gap-2'>
                <Button
                    label={type === 'email' ? 'Send' : 'Log'}
                    size='small'
                    type='submit'
                    loading={isLoading}
                />
                <Button
                    label='Cancel'
                    size='small'
                    type='button'
                    text
                    severity='contrast'
                    onClick={() => {
                        setMessage('');
                        setSelectedFiles([]);
                    }}
                />
            </div>
        </form>
    )
}