import { ERROR_MESSAGES } from '../../../../constants/error-messages';
import { getSession } from "../../../../adapters/auth/index";
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { useState } from 'react';
import { env } from "../../../../adapters/env";

export const SolidImportTransactionStatus = ({ importStatusResult, transactionId, setOpenImportDialog, handleFetchUpdatedRecords }: any) => {

  const [showPartialDialog, setShowPartialDialog] = useState(false);

  const handleDownloadFailedRecords = async (transactionId: number) => {
    try {
      const session: any = await getSession();
      const token = session?.user?.accessToken || "";
      if (!token) {
        throw new Error(ERROR_MESSAGES.NO_AUTH_TOKEN_FOUND);
      }
      const response = await fetch(
        `${env("API_URL")}/api/import-transaction/${transactionId}/export-failed-import-records`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error(ERROR_MESSAGES.FAILED_TO_DOWNLOAD);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Try to extract filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const match = contentDisposition?.match(/filename="(.+)"/);
      a.download = match?.[1] ?? "failed-records.xlsx"; // fallback if not found

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(ERROR_MESSAGES.DOWNLOAD_FAILED, error);
    }
  };

  const { status, failedCount = 0, importedCount = 0 } = importStatusResult?.data || {};

  const handleSuccessSyncImport = () => {
    setOpenImportDialog(false);
    setTimeout(() => {
      handleFetchUpdatedRecords();
    }, 150);
  };

  const handlePartialDialogConfirm = async () => {
    await handleDownloadFailedRecords(transactionId);
    setOpenImportDialog(false);
    setTimeout(() => {
      handleFetchUpdatedRecords();
    }, 150);
  };

  const getStatusTag = () => {
    if (status === "import_succeeded") {
      return <Button type='button' size='small' icon="pi pi-check-circle" severity="success" label={`${importedCount} row${importedCount > 1 ? 's' : ''} imported successfully`} />;
    }
    if (status === "import_failed" && importedCount === 0) {
      return <Button type='button' size='small' icon="pi pi-times-circle" severity="danger" label="Import Failed" />;
    }
    if (status === "import_failed" && importedCount > 0) {
      return <Button type='button' size='small' icon="pi pi-exclamation-triangle" severity="warning" label="Completed with Some Errors" />;
    }
    return <div>Import Status</div>;
  };

  return (
    <div>
      <div style={{ borderRadius: 6, border: '1px solid var(--primary-light-color)' }}>
        <div className='p-3' style={{ borderBottom: '1px solid var(--primary-light-color)', pointerEvents: 'none' }}>
          {getStatusTag()}
        </div>
        <div className='font-bold' style={{ color: 'var(--solid-primary-black)' }}>
          <div className='p-3 flex justify-content-between'>
            <span>No. of Successful Rows</span> <span>{importedCount ?? 0}</span>
          </div>
          <div className='px-3'>
            <div style={{ borderTop: '1px dashed var(--primary-light-color)' }}></div>
          </div>
          <div className='p-3 flex justify-content-between'>
            <span>No. of Failed Rows</span> <span>{failedCount ?? 0}</span>
          </div>
        </div>
      </div>
      <div className='mt-3 flex align-items-center gap-3'>
        {importedCount > 0 &&
          <Button
            label='View Imported Records'
            size='small'
            onClick={() => {
              if (status === "import_failed" && importedCount > 0) {
                setShowPartialDialog(true);
              } else {
                handleSuccessSyncImport();
              }
            }
            }
          />
        }
        {status === "import_failed" && transactionId &&
          <Button
            label="Download Failed Records"
            size='small'
            icon="pi pi-download"
            outlined
            severity='secondary'
            onClick={() => handleDownloadFailedRecords(transactionId)}
          />
        }
      </div>
      <Dialog
        header="View Imported Records"
        visible={showPartialDialog}
        onHide={() => setShowPartialDialog(false)}
        style={{
          width: '50vh'
        }}
        footer={
          <div className="flex justify-content-start gap-2">
            <Button
              label="Yes"
              size='small'
              icon="pi pi-download"
              onClick={handlePartialDialogConfirm}
            />
            <Button
              label="No"
              size='small'
              icon="pi pi-times"
              severity="secondary"
              outlined
              onClick={() => {
                handleSuccessSyncImport();
              }}
            />
          </div>
        }
        modal
      >
        <p>Do you want to download failed records before viewing the successful imports?</p>
      </Dialog>
    </div>
  )
}
