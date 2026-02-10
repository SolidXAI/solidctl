import { usePathname } from "../../../hooks/usePathname";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { useMountEffect } from "primereact/hooks";
import { Messages } from "primereact/messages";
import { Toast } from "primereact/toast";
import { useRef, useState } from "react";
import FieldMetaDataForm from "./FieldMetaDataForm";
import { ERROR_MESSAGES } from "../../../constants/error-messages";


const FieldMetaData = ({ setIsDirty, modelMetaData, fieldMetaData, setFieldMetaData, deleteModelFunction, nextTab, formikFieldsMetadataRef, params }: any) => {
  const pathname = usePathname();
  const msgs = useRef<Messages>(null);

  useMountEffect(() => {
    if (msgs.current) {
      msgs.current.clear();
      msgs.current.show({
        id: '1',
        sticky: true,
        severity: 'info',
        detail: `Please select Module and Datasource from the models Tab.`,
        closable: false,
      });
    }
  });
  const toast = useRef<Toast>(null);
  const [visiblePopup, setVisiblePopup] = useState(false);
  const [isRequiredPopUp, setIsRequiredPopUp] = useState(false);
  const [currentPopup, setCurrentPopup] = useState();
  const [selectedFieldMetaData, setSelectedFieldMetaData] = useState(null);
  const [deleteAlertPopup, setDeleteAlertPopup] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<any>(null);
  const onRowSelect = (event: any) => {
    setVisiblePopup(true);

  };

  // Template for the pencil icon column
  const editTemplate = (rowData: any) => {
    return (
      <>

        {rowData.isSystem !== true && rowData.isMarkedForRemoval !== true &&
          <Button
            icon="pi pi-pencil"
            text
            onClick={() => {
              setSelectedFieldMetaData(rowData);
              setVisiblePopup(true);
            }}
            size="small"
          />
        }
      </>
    )
  };
  const bodyTemplate = (rowData: any) => {
    return (
      <>

        {rowData.displayName &&
          <>
            <p>{rowData.displayName}
              {rowData.isMarkedForRemoval === true &&
                <>
                  <br></br>  <span style={{ fontSize: '11px', color: 'red' }}>This field will be removed next time you generate code for this model.</span>
                </>
              }
            </p>
          </>
        }
      </>
    )
  };


  // Function to delete a row
  const deleteRow = (rowData: any) => {
    //show dialog bbefore deletion & which will have to option ok and cancel
    setFieldMetaData((prevData: any) => {
      const updatedData = prevData.filter((item: any) => item.name !== rowData.name);
      setIsDirty(true); // Ensure dirty state is updated immediately
      return updatedData;
    });
  };

  // Template for the trash (delete) icon column
  const deleteTemplate = (rowData: any) => {
    return (
      <>
        {(pathname.includes('create') || (rowData.isSystem !== true && rowData.isMarkedForRemoval !== true)) &&
          <Button icon="pi pi-trash" text severity="danger" onClick={() => { setRowToDelete(rowData); setDeleteAlertPopup(true) }} size="small" />

        }
      </>
    )
  };

  const showToaster = async (message: any, severity: any) => {
    const errorMessages = Object.values(message);
    if (errorMessages.length > 0) {
      toast?.current?.show({
        severity: severity,
        summary: ERROR_MESSAGES.SEND_REPORT,
        life: 3000,
        //@ts-ignore
        content: (props) => (
          <div
            className="flex flex-column align-items-left"
            style={{ flex: "1" }}
          >
            {errorMessages.map((m, index) => (
              <div className="flex align-items-center gap-2" key={index}>
                <span className="font-bold text-900">{String(m)}</span>
              </div>
            ))}
          </div>
        ),
      });
    }
  };


  // const rowClass = (data: any) => {
  //   return {
  //     'bg-red-row': data.isMarkedForRemoval === true
  //   };
  // };


  return (
    <>

      {!modelMetaData.moduleId || !modelMetaData.dataSource ?
        <div className="card flex justify-content-center">
          <Messages ref={msgs} />
        </div>
        :
        <>
          <div className="absolute" style={{ top: -3, right: 0 }}>
            {/* <h3>All Fields</h3> */}
            {modelMetaData.isSystem !== true &&
              <Button
                label="Add"
                // icon="pi pi-external-link"
                onClick={() => {
                  if (!modelMetaData?.dataSourceType) {
                    toast.current?.show({
                      severity: 'error',
                      summary: ERROR_MESSAGES.ERROR,
                      detail: ERROR_MESSAGES.ORM_TYPE_REQUIRED,
                      sticky: true,
                    });
                  } else {
                    setSelectedFieldMetaData(null);
                    setVisiblePopup(true)
                  }
                }} size="small"
              />
            }
          </div>
          <DataTable value={fieldMetaData} dataKey="id" tableStyle={{ minWidth: '50rem' }} size="small">
            <Column field="displayName" header="Display Name" body={bodyTemplate} headerClassName="table-header-fs"></Column>
            <Column field="name" header="Name" headerClassName="table-header-fs"></Column>
            <Column field="type" header="Type" headerClassName="table-header-fs"></Column>

            {modelMetaData.isSystem !== true &&
              <Column body={editTemplate} header="Edit" headerClassName="table-header-fs" style={{ width: '10%' }} />
            }
            {modelMetaData.isSystem !== true &&
              <Column body={deleteTemplate} header="Delete" headerClassName="table-header-fs" style={{ width: '10%' }} />
            }
          </DataTable>
          <Dialog
            header=""
            visible={visiblePopup}
            style={{ width: "40vw" }}
            className="solid-dialog solid-field-dialog"
            onHide={() => {
              if (!visiblePopup) return;

              setVisiblePopup(false);
            }}
            showHeader={false}
          >
            <FieldMetaDataForm setIsDirty={setIsDirty} modelMetaData={modelMetaData} fieldMetaData={selectedFieldMetaData} allFields={fieldMetaData} setFieldMetaData={setFieldMetaData} deleteModelFunction={deleteModelFunction} setVisiblePopup={setVisiblePopup} formikFieldsMetadataRef={formikFieldsMetadataRef} params={params} setIsRequiredPopUp={setIsRequiredPopUp} showToaster={showToaster}></FieldMetaDataForm>
          </Dialog>
          <Dialog
            visible={isRequiredPopUp}
            header={(
              <div className="flex align-items-center">
                <i className="pi pi-exclamation-triangle text-yellow-500 text-xl mr-2"></i>
                <span>Warning</span>
              </div>
            )}
            headerClassName="text-center warning-header-popup"
            modal
            style={{ width: '20vw' }}
            onHide={() => setIsRequiredPopUp(false)}
            className="solid-dialog solid-confirm-dialog"
          >
            <p className="p-3 mb-0">If there is data against this model this operation might not work and manual intervention will be required</p>
            <div className="flex justify-content-start p-3">
              <Button label="Ok" className='small-button' onClick={() => setIsRequiredPopUp(false)} />
            </div>
          </Dialog>
          <Dialog
            visible={deleteAlertPopup}
            header={(
              <div className="flex align-items-center justify-content-center">
                <i className="pi pi-exclamation-triangle text-yellow-500 text-xl mr-2"></i>
                <span>Warning</span>
              </div>
            )}
            headerClassName="text-center warning-header-popup"
            modal
            style={{ width: '20vw' }}
            onHide={() => {
              setDeleteAlertPopup(false);
              setRowToDelete(null);
            }}
            className="solid-dialog solid-confirm-dialog"
          >
            <p className="p-3 mb-0 text-center">Are you sure you want to delete this field?</p>
            <div className="flex justify-content-start p-3 align-items-center justify-content-center gap-3">
              <Button
                label="Ok"
                className='small-button'
                onClick={() => {
                  if (rowToDelete) {
                    deleteRow(rowToDelete);
                  }
                  setDeleteAlertPopup(false);
                  setRowToDelete(null);
                }}
              />
              <Button
                label="Cancel"
                className='small-button'
                outlined
                severity="danger"
                onClick={() => {
                  setDeleteAlertPopup(false);
                  setRowToDelete(null);
                }}
              />
            </div>
          </Dialog>

        </>
      }
    </>



  );
};
export default FieldMetaData;
