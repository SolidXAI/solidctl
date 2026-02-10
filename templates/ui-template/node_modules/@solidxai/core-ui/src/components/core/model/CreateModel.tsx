

import { CancelButton, SolidCancelButton } from "../../../components/common/CancelButton";
import { handleError } from "../../../helpers/ToastContainer";
import { useGetFieldDefaultMetaDataQuery } from "../../../redux/api/fieldApi";
import { useCreatemodelMutation, useDeletemodelMutation, useLazyGetModelsQuery, useUpdatemodelMutation } from "../../../redux/api/modelApi";
import { FetchBaseQueryError } from "@reduxjs/toolkit/dist/query";
import { usePathname } from "../../../hooks/usePathname";
import { useRouter } from "../../../hooks/useRouter";
import { Button } from "primereact/button";
import { TabPanel, TabView } from "primereact/tabview";
import { Toast } from "primereact/toast";
import qs from "qs";
import { useEffect, useRef, useState } from "react";
import FieldMetaData from "./FieldMetaData";
import ModelMetaData from "./ModelMetaData";
import { BackButton } from "../../../components/common/BackButton";
import { SolidFormStepper } from "../../../components/common/SolidFormStepper";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { OverlayPanel } from "primereact/overlaypanel";
import { SolidBreadcrumb } from "../../../components/common/SolidBreadcrumb";
import { SolidFormHeader } from "../../../components/common/SolidFormHeader";
import { ERROR_MESSAGES } from "../../../constants/error-messages";

interface ErrorResponseData {
  message: string;
  statusCode: number;
  error: string;
}

const CreateModel = ({ data, params }: any) => {

  const toast = useRef<Toast>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [deleteEntity, setDeleteEntity] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(data ? true : false);
  const formikModelMetadataRef = useRef<any>();
  const formikFieldsMetadataRef = useRef();

  const [modelMetaData, setModelMetaData] = useState<any>();
  const [fieldMetaData, setFieldMetaData] = useState<any>([]);

  const { data: fieldDefaultMetaData, refetch } = useGetFieldDefaultMetaDataQuery(null);
  const [allModelsNames, setAllModelsNames] = useState([]);

  const [triggerGetModels, { data: allmodels, isLoading: isAllModelsLoaded, error: allModelsError }] =
    useLazyGetModelsQuery();


  const [
    createModel,
    { isLoading: isCreateModelLoading, isSuccess: isCreateModelSuccess, isError: isCreateModelError, error: createModelError, data: newModel },
  ] = useCreatemodelMutation();

  const [
    updateModel,
    { isLoading: isUpdatedModelUpdating, isSuccess: isUpdatedModelSuceess, isError: isUpdateModelError, error: updateModelError, data: updatedModel },
  ] = useUpdatemodelMutation();
  const [
    deleteModel,
    { isLoading: isModelDeleted, isSuccess: isDeleteModelSuceess, isError: isDeleteModelError, error: deleteModelError, data: DeletedModel },
  ] = useDeletemodelMutation();

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [tabErrors, setTabErrors] = useState<{ [key: number]: boolean }>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const nextTab = () => {
    setActiveIndex(activeIndex + 1);
  };

  useEffect(() => {
    if (data) {
      const isLegacyTable =  data.isLegacyTableWithId || data.isLegacyTable
      const isLegacyTableWithId = data.isLegacyTable ;
      const modelData = {
        ...data, moduleId: data?.module?.id, parentModelId: data?.parentModel,isLegacyTable,isLegacyTableWithId
      }

      setIsLoadingData(false);
      setModelMetaData(modelData);
      const fieldData = data.fields.map((f: any) => {
        const fieldCopy = { ...f }; // Create a shallow copy of the field object
        fieldCopy.identifier = f.id; // Add the identifier property
        if (fieldCopy.type == "mediaSingle" || fieldCopy.type == "mediaMultiple") {
          fieldCopy.mediaMaxSizeKb = f.mediaMaxSizeKb / 1024; // Add the identifier property

        }
        return fieldCopy;
      })
      setFieldMetaData(fieldData.sort((a: any, b: any) => b.id - a.id))
    }
  }, [data])


  useEffect(() => {
    const queryData = {
      offset: 0,
      limit: 1000,
    };
    const queryString = qs.stringify(queryData, {
      encodeValuesOnly: true
    });
    triggerGetModels(queryString);
  }, [isDeleteModelSuceess]);

  useEffect(() => {
    if (allmodels) {
      if (data) {
        setAllModelsNames(allmodels?.records.filter((i: any) => i.id !== data.id).map((e: any) => e.singularName));

      } else {

        setAllModelsNames(allmodels?.records.map((e: any) => e.singularName));
      }
    }
  }, [allmodels, data]);


  const handleSubmit = async () => {

    if (formikModelMetadataRef.current) {
      await formikModelMetadataRef.current.submitForm(); // Call the handleSubmit function from the formik instance

      // @ts-ignore
      // formikModelMetadataRef.current.validateForm().then(() => {
      //   if (Object.keys(formikModelMetadataRef?.current?.errors).length === 0) {

      //     if (fieldMetaData.length > 0) {
      //       handleFormSubmit();
      //     } else {
      //       if (activeIndex === 0) {
      //         nextTab();
      //         // showError({ error: "Please add Atleast one field" });
      //         handleError(["Please add Atleast one field"])
      //       } else {
      //         handleError(["Please add Atleast one field"])
      //         // showError({ error: "Please add Atleast one field" });
      //       }
      //     }
      //   }
      // });

      formikModelMetadataRef.current.validateForm().then((errors: any) => {
        let firstErrorTab: number | undefined;
        if (Object.keys(errors).length > 0) {
          setFormErrors(errors);
          const errorMessages = Object.values(errors);
          errorMessages.forEach((error) => {
            handleError([error]); // Call handleError for each error separately
          });

          firstErrorTab = 0; // Model Metadata tab has errors
        } else {
          setFormErrors({});
        }

        if (fieldMetaData.length === 0) {
          handleError([ERROR_MESSAGES.ADD_ATLEAST_ONE_FIELD]);
          firstErrorTab = firstErrorTab ?? 1; // If no prior error, set to Field tab
        }

        if (firstErrorTab !== undefined) {
          setTabErrors({ [firstErrorTab]: true }); // Set error only on the first tab with an issue
          setActiveIndex(firstErrorTab); // Switch to the tab with an error
        } else {
          handleFormSubmit();
        }
      });
    }
  };


  const handleFormSubmit = async () => {

      let legacyTableConfig = {};
  
      if (modelMetaData?.isLegacyTable && modelMetaData?.isLegacyTableWithId) {
        // UI: Both checked → Backend: both true
        legacyTableConfig = {
          isLegacyTable: true,
          isLegacyTableWithId: false
        };
      } else if (modelMetaData?.isLegacyTable && !modelMetaData?.isLegacyTableWithId) {
        // UI: Only isLegacyTable checked → Backend: only isLegacyTableWithId true
        legacyTableConfig = {
          isLegacyTable: false,
          isLegacyTableWithId: true
        };
      } else {
        // UI: Neither checked → Backend: both false
        legacyTableConfig = {
          isLegacyTable: false,
          isLegacyTableWithId: false
        };
      }

    if (modelMetaData?.isLegacyTable || modelMetaData?.isLegacyTableWithId) {
      const hasPrimaryKey = fieldMetaData.some(
        (field: any) => field.isPrimaryKey === true
      );
  
      if (!hasPrimaryKey) {
        toast?.current?.show({
          severity: "error",
          summary: "Primary Key Required",
           detail: "Legacy tables set at least one field marked as Primary Key. Please mark a field as Primary Key before proceeding.",
            life: 5000,
        });
        return; 
      }
    }

    if (data) {
      const fieldData = fieldMetaData.map(({ createdAt, updatedAt, deletedAt, mediaStorageProvider, identifier, ...rest }: any) => {
        if (rest.mediaMaxSizeKb) {
          rest.mediaMaxSizeKb = rest.mediaMaxSizeKb ? rest.mediaMaxSizeKb * 1024 : 0
        }
        return rest
      });
      const { module, parentModel, createdAt, updatedAt, id, deletedAt, ...modelData } = modelMetaData;
      const updateData = { ...modelData, displayName: modelData.displayName.trim(), fields: fieldData, ...legacyTableConfig };
      updateModel({ id: data.id, data: updateData });
    }
    else {
      if (modelMetaData) {
        const fieldData = fieldMetaData.map(({ mediaStorageProvider, identifier, ...rest }: any) => {
          if (rest.mediaMaxSizeKb) {
            rest.mediaMaxSizeKb = rest.mediaMaxSizeKb ? rest.mediaMaxSizeKb * 1024 : 0
          }
          return rest
        });
        const { module, parentModel, ...modelData } = modelMetaData;
        const data = { ...modelData, displayName: modelData.displayName.trim(), fields: fieldData, ...legacyTableConfig };
        createModel(data);
        if (isCreateModelSuccess) {

        }
      }
    }
  };

  const deleteModelFunction = async () => {
    deleteModel(data?.id);
  }

  useEffect(() => {
    if (isCreateModelSuccess == true || isUpdatedModelSuceess == true || isDeleteModelSuceess == true) {
      // router.push(`/admin/app-builder/model/all`);
      router.back();
    }
  }, [isCreateModelSuccess, isUpdatedModelSuceess, isDeleteModelSuceess])

  const showError = async (errors: any) => {
    const errorMessages = Object.values(errors);

    if (errorMessages.length > 0) {
      toast?.current?.show({
        severity: "error",
        summary: ERROR_MESSAGES.SEND_REPORT,
        // sticky: true,
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

  const isFetchBaseQueryErrorWithErrorResponse = (error: any): error is FetchBaseQueryError & { data: ErrorResponseData } => {
    return error && typeof error === 'object' && 'data' in error && 'message' in error.data;
  }

  // const handleError = (errorToast: any) => {
  //   let errorMessage: any = ['An error occurred'];

  //   if (isFetchBaseQueryErrorWithErrorResponse(errorToast)) {
  //     errorMessage = errorToast.data.message;
  //   } else {
  //     errorMessage = ['Something went wrong'];
  //   }

  //   toast?.current?.show({
  //     severity: 'error',
  //     summary: 'Error',
  //     detail: errorMessage,
  //     life: 3000,
  //     //@ts-ignore
  //     content: (props) => (
  //       <div className="flex flex-column align-items-left" style={{ flex: "1" }}>
  //         {Array.isArray(errorMessage) ? (
  //           errorMessage.map((message, index) => (
  //             <div className="flex align-items-center gap-2" key={index}>
  //               <span className="font-bold text-900">{message.trim()}</span>
  //             </div>
  //           ))
  //         ) : (
  //           <div className="flex align-items-center gap-2">
  //             <span className="font-bold text-900">{errorMessage?.trim()}</span>
  //           </div>
  //         )}
  //       </div>
  //     ),
  //   });
  // };


  // Error Handler 
  // Added useEffect to remove active tab class border color if error is there.
  useEffect(() => {
    const tabHeaders = document.querySelectorAll(".p-tabview-nav li");
    if (tabHeaders.length > 0) {
      if (tabErrors[0]) {
        tabHeaders[0].classList.remove("p-highlight");
      }
      if (tabErrors[1]) {
        tabHeaders[1].classList.remove("p-highlight");
      }
    }
  }, [tabErrors]);


  useEffect(() => {
    const errors = [
      { isError: isCreateModelError, error: createModelError },
      { isError: isDeleteModelError, error: deleteModelError },
      { isError: isUpdateModelError, error: updateModelError },
    ];
    if (errors.length > 0) {
      // Handle any error
      errors.forEach(({ isError, error }) => {
        if (isError && error) {
          handleError(error); // Call the centralized error handler
        }
      });
    }

  }, [isCreateModelError, isDeleteModelError, isUpdateModelError])
  const op = useRef(null);

  const formActionDropdown = () => {
    return (
      <div>
        <Button
          outlined
          severity="secondary"
          type="button"
          icon={'pi pi-cog'}
          size="small"
          className="surface-card p-0 hidden md:flex"
          style={{
            height: 33.06,
            width: 33.06
          }}
          onClick={(e) =>
            // @ts-ignore 
            op.current.toggle(e)
          }
        />
        <Button
          outlined
          type="button"
          icon={'pi pi-cog'}
          size="small"
          className="surface-card p-0 solid-icon-button md:hidden"
          // style={{
          //   height: 33.06,
          //   width: 33.06
          // }}
          onClick={(e) =>
            // @ts-ignore 
            op.current.toggle(e)
          }
        />
        <OverlayPanel ref={op} className="solid-custom-overlay">
          <div className="flex flex-column gap-1 p-1">
            {/* <Button
              text
              type="button"
              className="w-8rem text-left gap-2 text-color"
              label="Duplicate"
              size="small"
              iconPos="left"
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 11.9997C5.63333 11.9997 5.31944 11.8691 5.05833 11.608C4.79722 11.3469 4.66667 11.033 4.66667 10.6663V2.66634C4.66667 2.29967 4.79722 1.98579 5.05833 1.72467C5.31944 1.46356 5.63333 1.33301 6 1.33301H12C12.3667 1.33301 12.6806 1.46356 12.9417 1.72467C13.2028 1.98579 13.3333 2.29967 13.3333 2.66634V10.6663C13.3333 11.033 13.2028 11.3469 12.9417 11.608C12.6806 11.8691 12.3667 11.9997 12 11.9997H6ZM6 10.6663H12V2.66634H6V10.6663ZM3.33333 14.6663C2.96667 14.6663 2.65278 14.5358 2.39167 14.2747C2.13056 14.0136 2 13.6997 2 13.333V3.99967H3.33333V13.333H10.6667V14.6663H3.33333Z" fill="black" fill-opacity="0.88" />
              </svg>}
            /> */}
            <Button
              text
              type="button"
              className="w-8rem text-left gap-2"
              label="Delete"
              size="small"
              iconPos="left"
              severity="danger"
              icon={'pi pi-trash'}
              onClick={() => setDeleteEntity(true)}
            />
          </div>
        </OverlayPanel>
      </div>
    )
  }

  const [isDirty, setIsDirty] = useState(false);


  return (
    <div className="solid-form-wrapper">
      <Toast ref={toast} />
      <div style={{ width: '100%', borderRight: '1px solid var(--primary-light-color' }}>
        <div className="solid-form-header">
          {params.id === "new" ?
            <>
              <div className="flex align-items-center gap-3">
                <BackButton />
                <div className="form-wrapper-title solid-long-text-wrapper  ">Create Model {modelMetaData?.displayName ? `- ${modelMetaData?.displayName}` : ""}</div>
              </div>
              <div className="gap-3 flex">
                {isDirty &&
                  <Button label="Save" size="small" onClick={handleSubmit} type="submit" />
                }
                <CancelButton />
              </div>
            </>
            :
            <>
              <div className="flex align-items-center gap-3">
                <BackButton />
                <div className="form-wrapper-title solid-long-text-wrapper ">Edit Model {modelMetaData?.displayName ? `- ${modelMetaData?.displayName}` : ""}</div>
              </div>
              <div className="gap-3 flex">
                {data?.isSystem !== true &&
                  <>
                    <div>
                      {isDirty &&
                        <>
                          <Button label="Save" size="small" type="submit" className="hidden lg:flex" onClick={handleSubmit} />
                          <Button icon="pi pi-check" size="small" type="submit" className=" lg:hidden solid-icon-button" onClick={handleSubmit} />
                        </>
                      }
                    </div>
                    {/* <div>
                      <Button outlined label="Delete" size="small" severity="danger" type="button" onClick={() => setDeleteEntity(true)} />
                    </div> */}
                  </>
                }
                {/* <CancelButton /> */}
                <SolidCancelButton />
                {formActionDropdown()}
              </div>
            </>
          }
        </div>
        <SolidFormHeader />
        {/* <div className="solid-form-stepper">
          <SolidFormStepper />
        </div> */}
        <div className="px-4 py-3 md:p-4 solid-form-content">
          <TabView
            activeIndex={activeIndex}
            onTabChange={(e) => {
              if (activeIndex == 0) {
                formikModelMetadataRef.current.handleSubmit();
                setActiveIndex(e.index)

              }
              if (activeIndex == 1) {
                setActiveIndex(e.index)
              }

            }}
            panelContainerClassName="px-0"
            className="relative"
          >
            <TabPanel header="Model"
              headerClassName={tabErrors[0] ? "tab-error-heading " : ""}>
              <ModelMetaData
                modelMetaData={modelMetaData}
                setModelMetaData={setModelMetaData}
                allModelsNames={allModelsNames}
                deleteModelFunction={deleteModelFunction}
                nextTab={nextTab}
                formikModelMetadataRef={formikModelMetadataRef}
                params={params}
                formErrors={formErrors}
                setIsDirty={setIsDirty}
              ></ModelMetaData>
            </TabPanel>
            <TabPanel header="Fields"
              headerClassName={tabErrors[1] ? "tab-error-heading " : ""}>
              <FieldMetaData
                modelMetaData={modelMetaData}
                fieldMetaData={fieldMetaData}
                setFieldMetaData={setFieldMetaData}
                deleteModelFunction={deleteModelFunction}
                nextTab={nextTab}
                formikFieldsMetadataRef={formikFieldsMetadataRef}
                params={params}
                setIsDirty={setIsDirty}
              ></FieldMetaData>
            </TabPanel>
          </TabView>
        </div>
      </div>
      {/* <div style={{ width: '22.5%' }}></div> */}
      <Dialog header="Delete Field" headerClassName="py-2" className="solid-confirm-dialog" contentClassName="px-0 pb-0" visible={deleteEntity} style={{ width: '20vw' }} onHide={() => { if (!deleteEntity) return; setDeleteEntity(false); }}>
        <Divider className="m-0" />
        <div className="p-4">
          <p className="m-0 solid-primary-title" style={{ fontSize: 16 }}>
            Are you sure you want to delete this Field ?
          </p>
          <p className="" style={{ color: 'var{--solid-grey-500}' }}>{modelMetaData?.singularName}</p>
          <div className="flex align-items-center gap-2 mt-3">
            <Button label="Delete" size="small" onClick={deleteModelFunction} />
            <Button label="Cancel" size="small" onClick={() => setDeleteEntity(false)} outlined />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default CreateModel;
