import { Button } from 'primereact/button'
import styles from './SolidImport.module.css'
import { useLazyGetImportInstructionsQuery } from '../../../../redux/api/importTransactionApi';
import { useEffect } from 'react';
import { getSession } from "../../../../adapters/auth/index";
import { ERROR_MESSAGES } from '../../../../constants/error-messages';
import { env } from "../../../../adapters/env";

export const SolidImportInstructions = ({ setImportStep, listViewMetaData }: any) => {
    const [getImportInstructions, { data: importInstructionsData, isLoading, isError }] =
        useLazyGetImportInstructionsQuery();

    useEffect(() => {
        if (listViewMetaData && listViewMetaData?.data?.solidView?.model?.id) {
            getImportInstructions({ id: listViewMetaData?.data?.solidView?.model?.id });
        }
    }, [listViewMetaData, getImportInstructions]);

    const handleTemplateDownload = async (format: 'csv' | 'excel') => {
        const modelId = listViewMetaData?.data?.solidView?.model?.id;
        if (!modelId) return;
        try {
            const session: any = await getSession();
            const token = session?.user?.accessToken || "";
            if (!token) {
                throw new Error(ERROR_MESSAGES.NO_AUTH_TOKEN_FOUND);
            }
            const response = await fetch(
                `${env("API_URL")}/api/import-transaction/import-template/${modelId}/${format}`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                }
            );

            if (!response.ok) {
                throw new Error(ERROR_MESSAGES.FILE_DOWNLOAD_FAILED);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `import-template.${format === 'csv' ? 'csv' : 'xlsx'}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(ERROR_MESSAGES.DOWNLOAD_FAILED, error);
        }
    };

    return (
        <div>
            <div className={styles.SolidImportContextWrapper}>
                <div className='p-3 h-full'>
                    <div className='grid'>
                        <div className={`${importInstructionsData?.data?.custom.length > 0 ? 'col-7' : 'col-12'}`} style={{ borderRight: importInstructionsData?.data?.custom.length > 0 ? '1px solid var(--primary-light-color)' : '', overflowY: 'auto', height: '48vh' }}>
                            <h5 className='solid-primary-black-text'>Standard Instructions</h5>
                            <ol className='p-0' style={{ listStyleType: 'none' }}>
                                <li>
                                    <p className='font-medium solid-primary-black-text'>1. CSV or Excel (based on radio button selected) template:</p>
                                    <div className='flex align-items-centerm gap-3'>
                                        <Button label='CSV Download' icon="pi pi-download" iconPos='right' size='small' onClick={() => handleTemplateDownload('csv')} />
                                        <Button label='Excel Download' icon="pi pi-download" iconPos='right' size='small' onClick={() => handleTemplateDownload('excel')} />
                                    </div>
                                </li>
                                {(() => {
                                    let count = 2; // Start numbering from 2
                                    return (importInstructionsData?.data?.standard &&
                                        (Object.entries(importInstructionsData.data.standard) as [string, string[]][])
                                            .map(([key, values]) => {
                                                if (!values?.length) return null;

                                                const titleCaseKey = key
                                                    .replace(/([A-Z])/g, ' $1')
                                                    .replace(/^./, str => str.toUpperCase());

                                                const rendered = (
                                                    <li key={key} className='mt-3'>
                                                        <p className='font-medium solid-primary-black-text mb-1'>
                                                            {count}. {titleCaseKey}:
                                                        </p>
                                                        <div className='flex flex-wrap'>
                                                            {values.map((item: any, i) => (
                                                                <span key={i} className='mr-2'>
                                                                    {typeof item === 'string'
                                                                        ? item
                                                                        : item?.fieldName
                                                                            ? `${item.fieldName} (Regex: ${item.regexPattern})`
                                                                            : JSON.stringify(item)}
                                                                    {i < values.length - 1 ? ', ' : ''}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </li>
                                                );

                                                count++;
                                                return rendered;
                                            }));
                                })()}
                            </ol>
                        </div>
                        {importInstructionsData?.data?.custom.length > 0 &&
                            <div className='col-5' style={{ overflowY: 'auto', height: '48vh' }}>
                                <h5 className='solid-primary-black-text'>Custom Instructions</h5>
                            </div>
                        }
                    </div>
                </div>
            </div>
            <div className='mt-3 flex align-items-center gap-3'>
                <Button label='Continue' size='small' onClick={() => setImportStep(2)} />
                {/* <Button label='Cancel' size='small' outlined /> */}
            </div>
        </div>
    )
}
