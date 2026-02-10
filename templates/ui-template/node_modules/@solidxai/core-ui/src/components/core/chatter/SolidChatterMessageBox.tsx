
import { getTextColor, stringToColor } from '../../../helpers/getRandomColors'
import Image from "../../common/Image"
import { Avatar } from 'primereact/avatar'
import { Dialog } from 'primereact/dialog'
import { useMemo, useState } from 'react'
import styles from './chatter.module.css'
import { SolidChatterCustomMessage } from './SolidChatterCustomMessage'
import { SolidChatterAuditMessage } from './SolidChatterAuditMessage'

interface Props {
    user: string,
    messageType?: string,
    message?: any,
    time?: string,
    auditRecord?: any,
    messageSubType?: string,
    modelDisplayName?: string,
    modelUserKey?: string,
    media?: {
        messageAttachments?: Array<{
            id: number;
            relativeUri: string;
            mimeType: string;
            originalFileName: string;
            _full_url: string;
        }>;
    };
}

const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
        return 'pi pi-image';
    }
    switch (mimeType) {
        case 'application/pdf':
            return 'pi pi-file-pdf';
        case 'application/vnd.ms-excel':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            return 'pi pi-file-excel';
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return 'pi pi-file-word';
        case 'text/plain':
            return 'pi pi-file';
        default:
            return 'pi pi-file';
    }
};

export const SolidChatterMessageBox = (props: Props) => {
    const { user, messageType, message, time, auditRecord, media, messageSubType, modelDisplayName, modelUserKey } = props;
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isImageDialogVisible, setIsImageDialogVisible] = useState(false);

    const avatarStyle = useMemo(() => {
        const bg = stringToColor(user)
        const color = getTextColor(bg)
        return { backgroundColor: bg, color, height: 24, width: 24, fontSize: 10, fontWeight: 600 }
    }, [user])

    const handleImageClick = (url: string) => {
        setSelectedImage(url);
        setIsImageDialogVisible(true);
    };

    const renderMessageContent = () => {
        switch (messageType) {
            case 'audit':
                return <SolidChatterAuditMessage auditRecord={auditRecord} />;
            case 'custom':
            default:
                return <SolidChatterCustomMessage message={message} />;
        }
    };

    return (
        <div className={styles.solidChatterMessageBox}>
            <div className='flex align-items-center'>
                <div style={{ width: 32 }}>
                    <Avatar label={user.charAt(0).toUpperCase()} style={avatarStyle} shape="circle" />
                </div>
                <div className='flex align-items-center justify-content-between' style={{ width: '100%' }}>
                    <div className='text-sm'>
                        <span className='font-bold'>{user}</span>
                        <span className='ml-2' style={{ color: '#949494' }}>
                            {messageType === 'audit' ? messageSubType === "audit_update"
                                ? <>Updated {modelUserKey && <span style={{ fontStyle: 'italic', fontWeight: '600' }}>({modelUserKey})</span>}</>
                                : messageSubType === "audit_insert"
                                    ? <>Inserted {modelUserKey && <span style={{ fontStyle: 'italic', fontWeight: '600' }}>({modelUserKey})</span>}</>
                                    : "Custom" : "Custom"}
                        </span>
                    </div>
                    {modelDisplayName && <span style={{ fontStyle: 'italic', fontWeight: '600' }}>{modelDisplayName}</span>}
                </div>
            </div>
            <div className='flex align-items-center mt-1'>
                <div style={{ width: 32 }}>
                </div>
                <div style={{ width: '100%' }}>
                    <p className='mb-1 text-sm font-bold' style={{ color: '#949494' }}>
                        {time}
                    </p>
                    {message && <div className={styles.solidMessageWrapper}>
                        {renderMessageContent()}
                    </div>}
                    {media?.messageAttachments && media.messageAttachments.length > 0 && (
                        <div className='flex flex-wrap gap-2 mt-2'>
                            {media.messageAttachments.map((attachment) => {
                                const isImage = attachment.mimeType.startsWith('image/');
                                return (
                                    <div key={attachment.id} className='flex align-items-center gap-2 bg-gray-100 p-2 rounded'>
                                        {isImage ? (
                                            <div
                                                className='cursor-pointer'
                                                onClick={() => handleImageClick(attachment._full_url)}
                                            >
                                                <Image
                                                    src={encodeURI(attachment._full_url)}
                                                    alt={attachment.originalFileName}
                                                    width={50}
                                                    height={50}
                                                    className='rounded'
                                                    style={{ objectFit: 'cover' }}
                                                />
                                            </div>
                                        ) : (
                                            <a
                                                href={encodeURI(attachment._full_url)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className='flex align-items-center gap-2 text-decoration-none'
                                            >
                                                <i className={getFileIcon(attachment.mimeType)} />
                                                <span className='text-sm'>{attachment.originalFileName}</span>
                                            </a>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            <Dialog
                visible={isImageDialogVisible}
                onHide={() => setIsImageDialogVisible(false)}
                className='w-9 '
                modal
            >
                {selectedImage && (
                    <Image
                        src={selectedImage}
                        alt="Preview"
                        width={800}
                        height={600}
                        style={{ width: '100%', height: 'auto' }}
                    />
                )}
            </Dialog>
        </div>
    )
}
