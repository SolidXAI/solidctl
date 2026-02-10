
import { Dialog } from 'primereact/dialog';
import React, { useState } from 'react'
import { SolidImportStepper } from './SolidImportStepper';
import { SolidImportInstructions } from './SolidImportInstructions';
// import { SolidImportWrapper } from './SolidImportWrapper';
import { SolidImportDropzone } from './SolidImportDropzone';
import { SolidImportTransaction } from './SolidImportTransaction';
import { SolidImportTransactionStatus } from './SolidImportTransactionStatus';

export const SolidGenericImport = ({
    openImportDialog,
    setOpenImportDialog,
    listViewMetaData,
    handleFetchUpdatedRecords
}: any) => {
    const [importStep, setImportStep] = useState<number>(1)
    const [transactionId, setTransactionId] = useState(null);
    const [importStatusResult, setImportStatusResult] = useState<any>(null)
    const modelMetadataId = listViewMetaData?.data?.solidView?.model?.id;
    return (
        <Dialog
            header={<h5 className='m-0'>Import Data</h5>}
            visible={openImportDialog}
            style={{ width: '60vw' }}
            onHide={() => { if (!openImportDialog) return; setOpenImportDialog(false); }}
            headerClassName="px-4 py-2 secondary-border-bottom solid-import-dialog-header"
            contentClassName="p-0"
            className='solid-import-dialog'
        >
            <SolidImportStepper importStep={importStep} setImportStep={setImportStep} />
            <div className='px-3 md:px-4 py-3'>
                {importStep === 1 &&
                    <SolidImportInstructions setImportStep={setImportStep} listViewMetaData={listViewMetaData} />
                }
                {/* {importStep === 2 &&
                    <SolidImportWrapper handleFetchUpdatedRecords={handleFetchUpdatedRecords} setImportStep={setImportStep} listViewMetaData={listViewMetaData} setOpenImportDialog={setOpenImportDialog} />
                } */}
                {importStep === 2 &&
                    <SolidImportDropzone
                        setImportStep={setImportStep}
                        setTransactionId={setTransactionId}
                        modelMetadataId={modelMetadataId}
                    />
                }
                {importStep === 3 &&
                    <SolidImportTransaction
                        transactionId={transactionId}
                        setImportStatusResult={setImportStatusResult}
                        setImportStep={setImportStep}
                    />
                }
                {importStep === 4 &&
                    <SolidImportTransactionStatus
                        importStatusResult={importStatusResult}
                        transactionId={transactionId}
                        setOpenImportDialog={setOpenImportDialog}
                        handleFetchUpdatedRecords={handleFetchUpdatedRecords}
                    />
                }
            </div>
        </Dialog>
    )
}