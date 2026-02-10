
import React, { useState } from 'react'
import { SolidImportDropzone } from './SolidImportDropzone'
import { SolidImportTransaction } from './SolidImportTransaction'

export const SolidImportWrapper = ({ setImportStep, listViewMetaData, setOpenImportDialog, handleFetchUpdatedRecords }: any) => {
    const [importTransactionContext, setImportTransactionContext] = useState(false);
    const [transactionId, setTransactionId] = useState(null);
    const modelMetadataId = listViewMetaData?.data?.solidView?.model?.id;
    return (
        <div>
            {!importTransactionContext ?
                <SolidImportDropzone
                    setImportStep={setImportStep}
                    setImportTransactionContext={setImportTransactionContext}
                    setTransactionId={setTransactionId}
                    modelMetadataId={modelMetadataId}
                />
                :
                <SolidImportTransaction
                    transactionId={transactionId}
                    setImportTransactionContext={setImportTransactionContext}
                    setOpenImportDialog={setOpenImportDialog}
                    handleFetchUpdatedRecords={handleFetchUpdatedRecords}
                />
            }
        </div>
    )
}