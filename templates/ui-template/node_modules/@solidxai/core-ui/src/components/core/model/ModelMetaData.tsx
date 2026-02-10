
import { SingleSelectAutoCompleteField } from "../../../components/common/SingleSelectAutoCompleteField";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import { getSingularAndPlural } from "../../../helpers/helpers";
import { useGetFieldDefaultMetaDataQuery } from "../../../redux/api/fieldApi";
import { useLazyGetModelsQuery } from "../../../redux/api/modelApi";
import { useLazyGetmodulesQuery } from "../../../redux/api/moduleApi";
import { useFormik } from "formik";
import { snakeCase } from "lodash";
import { usePathname } from "../../../hooks/usePathname";
import { useRouter } from "../../../hooks/useRouter";
import { Checkbox } from "primereact/checkbox";
import { Divider } from "primereact/divider";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Panel } from "primereact/panel";
import { Toast } from "primereact/toast";
import { classNames } from "primereact/utils";
import qs from "qs";
import React, { useEffect, useRef, useState } from "react";
import * as Yup from "yup";

const ModelMetaData = React.forwardRef(({ modelMetaData, setModelMetaData, allModelsNames, deleteModelFunction, nextTab, formikModelMetadataRef, params, formErrors, setIsDirty }: any, ref) => {

  // const ModelMetaData = ({ modelMetaData, setModelMetaData, deleteModelFunction, nextTab, formikModelMetadataRef }: any) => {   

  const router = useRouter();
  const toast = useRef<Toast>(null);
  const pathname = usePathname();

  const [triggerGetModules, { data: moduleData, isFetching: isModuleFetching, error: moduleError }] = useLazyGetmodulesQuery();
  const [triggerGetModels, { data: modelData, isFetching: isModelFetching, error: modelError }] = useLazyGetModelsQuery();
  const { data: fieldDefaultMetaData, isLoading, error, refetch } = useGetFieldDefaultMetaDataQuery(null);


  const dataSourceTypes = [
    { label: "Mysql", value: "mysql" },
    { label: "Postgres", value: "postgres" },
    { label: "Mssql", value: "mssql" },
    { label: "Oracle", value: "oracle" },
    { label: "Mariadb", value: "mariadb" },
  ];



  const initialValues = {
    singularName: modelMetaData ? modelMetaData?.singularName : "",
    pluralName: modelMetaData ? modelMetaData?.pluralName : "",
    displayName: modelMetaData ? modelMetaData?.displayName : "",
    description: modelMetaData ? modelMetaData?.description : "",
    dataSource: modelMetaData ? modelMetaData?.dataSource : "",
    dataSourceType: modelMetaData ? modelMetaData?.dataSourceType : "",
    tableName: modelMetaData ? modelMetaData?.tableName : null,
    moduleId: modelMetaData ? modelMetaData?.module?.id : "",
    module: modelMetaData ? modelMetaData?.module : "",
    isSystem: modelMetaData ? modelMetaData?.isSystem : false,
    enableSoftDelete: modelMetaData ? modelMetaData?.enableSoftDelete : "",
    enableAuditTracking: modelMetaData ? modelMetaData?.enableAuditTracking : true,
    internationalisation: modelMetaData ? modelMetaData?.internationalisation : "",
    draftPublishWorkflow: modelMetaData ? modelMetaData?.draftPublishWorkflow : "",
    isChild: modelMetaData ? modelMetaData?.isChild : "",
    parentModelId: modelMetaData ? modelMetaData?.parentModel?.id : "",
    parentModel: modelMetaData ? modelMetaData?.parentModel : "",
    isLegacyTable: modelMetaData ? modelMetaData?.isLegacyTable : false,
    isLegacyTableWithId: modelMetaData ? modelMetaData?.isLegacyTableWithId : false,
  //   isLegacyTable: modelMetaData 
  //   ? (modelMetaData.isLegacyTable && modelMetaData.isLegacyTableWithId && params.id !== 'new') 
  //     ? true  
  //     : modelMetaData.isLegacyTableWithId 
  //       ? true  
  //       : false 
  //   : false,
    
  // isLegacyTableWithId: modelMetaData 
  //   ? (modelMetaData.isLegacyTable && modelMetaData.isLegacyTableWithId &&  params.id !== 'new') 
  //     ? true  
  //     : false  
  //   : false,
  };

  const [showTableName, setShowTableName] = useState<any>(false);
  const [showParentModel, setShowParentModel] = useState<any>(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);


  useEffect(() => {
    if (modelMetaData && modelMetaData.tableName) {
      setShowTableName(true)
    }
    if (modelMetaData && modelMetaData.isChild) {
      setShowParentModel(true)
    }
    else if (modelMetaData && !modelMetaData.isChild) {
      setShowParentModel(false)
    }
  }, [modelMetaData])

  const validationSchema = Yup.object({
    singularName: Yup.string()
      // .matches(
      //   /^[a-z]+(-[a-z]+)*$/,
      //   "Invalid format. Use lowercase letters and hyphens only"
      // )
      .notOneOf(allModelsNames, ERROR_MESSAGES.FIELD_ALREADY_USE('Name', 'name'))
      .required(ERROR_MESSAGES.FIELD_REUQIRED('Singular Name')),
    pluralName: Yup.string()
      // .matches(
      //   /^[a-z]+(-[a-z]+)*$/,
      //   "Invalid format. Use lowercase letters and hyphens only"
      // )
      .required(ERROR_MESSAGES.FIELD_REUQIRED('Plural Name')),
    // tableName: Yup.string().required().matches(/^[a-z0-9_]+$/, ERROR_MESSAGES.SNAKE_CASE('Tabale')),
    displayName: Yup.string().required(ERROR_MESSAGES.FIELD_REUQIRED("Display Name")),
    description: Yup.string().required(ERROR_MESSAGES.FIELD_REUQIRED("Description Name")),
    dataSource: Yup.string().required(ERROR_MESSAGES.FIELD_REUQIRED("Data Source")),
    dataSourceType: Yup.string().required(ERROR_MESSAGES.FIELD_REUQIRED("Data Source Type")),
    moduleId: Yup.number().required(ERROR_MESSAGES.FIELD_REUQIRED("Module Id")),
    module: Yup.object().required(ERROR_MESSAGES.FIELD_REUQIRED("Module")),
    isSystem: Yup.boolean(),
    enableSoftDelete: Yup.boolean(),
    enableAuditTracking: Yup.boolean(),
    internationalisation: Yup.boolean(),
    draftPublishWorkflow: Yup.boolean(),
    isChild: Yup.boolean(),
    parentModelId: Yup.number().when("isChild", (isChild: any, schema) => {
      if (isChild.length > 0 && isChild[0] == true) {
        return schema.required(ERROR_MESSAGES.FIELD_REUQIRED('Parent Model Id'))
      } else {
        return schema.notRequired().nullable();
      }
    }),
    parentModel: Yup.object().when("isChild", (isChild: any, schema) => {
      if (isChild.length > 0 && isChild[0] == true) {
        return schema.required(ERROR_MESSAGES.FIELD_REUQIRED('Parent Model'))
      } else {
        return schema.notRequired().nullable();
      }
    }),
    isLegacyTable: Yup.boolean(),
    isLegacyTableWithId: Yup.boolean(),
  });



  const isFormFieldValid = (formik: any, fieldName: string) =>
    formik.touched[fieldName] && formik.errors[fieldName];

  const formik = useFormik({
    initialValues,
    validationSchema,
    validateOnChange: true, // This ensures validation runs when a field value is changed
    enableReinitialize: true,
    innerRef: formikModelMetadataRef,
    onSubmit: async (values) => {
      const tableName = generateTableName(values.module.displayName, values.singularName);

      try {
        const modelData = {
          ...modelMetaData,
          singularName: values.singularName,
          pluralName: values.pluralName,
          displayName: values.displayName,
          description: values.description,
          dataSource: values.dataSource,
          dataSourceType: values.dataSourceType,
          tableName: values?.tableName || tableName,
          moduleId: values.moduleId,
          module: values.module,
          isSystem: values.isSystem ? values.isSystem === true : '',
          enableSoftDelete: values.enableSoftDelete === true ? true : '',
          enableAuditTracking: values.enableAuditTracking === true ? true : '',
          internationalisation: values.internationalisation === true ? true : '',
          draftPublishWorkflow: values.draftPublishWorkflow === true ? true : '',
          isChild: values.isChild === true ? true : '',
          ...(values.isChild == true && {
            parentModelId: values.parentModelId,
            parentModel: values.parentModel,
          }),
          isLegacyTable:values.isLegacyTable === true ? true : false,
          isLegacyTableWithId:values.isLegacyTableWithId === true ? true :false
           
        };
        setModelMetaData(modelData);
        nextTab()

      } catch (err) {
        console.error(ERROR_MESSAGES.CREATE_MODEL, err);
      }
    },
  });

  function generateTableName(moduleSlug: string, modelName: string): string {
    const snakeCaseModelName = snakeCase(modelName);
    const sankeCaseModuleName = snakeCase(moduleSlug);
    return `${sankeCaseModuleName}_${snakeCaseModelName}`;
  }

  const showError = async () => {
    const errors = await formik.validateForm(); // Trigger validation and get the updated errors
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


  const searchModule = async (event: any) => {
    try {
      const query = event.query;
      const queryData = {
        limit: 10,
        offset: 0,
        filters: {
          name: {
            $containsi: query,
          },
        },
      };

      const queryString = qs.stringify(queryData, {
        encodeValuesOnly: true,
      });

      const result = await triggerGetModules(queryString).unwrap();

      if (result && result.records) {
        const updatedSuggestion = [...result.records];
        return updatedSuggestion
      } else {
        return []
      }
    } catch (error) {
      return []
    }
  };


  const searchModel = async (event: any) => {
    try {
      const query = event.query;
      const queryData = {
        limit: 10,
        offset: 0,
        filters: {
          singularName: {
            $containsi: query,
          },
        },
      };

      // Add module filter dynamically
      if (selectedModule?.name) {
        (queryData.filters as any)["module"] = {
          name: { $containsi: selectedModule.name },
        };
      }


      const queryString = qs.stringify(queryData, {
        encodeValuesOnly: true,
      });

      const result = await triggerGetModels(queryString).unwrap();

      if (result && result.records) {
        const updatedSuggestion = [...result.records];
        return updatedSuggestion
      } else {
        return []
      }
    } catch (error) {
      return []
    }
  };


  const serachDataSource = async (event: any) => {
    const query = event.query;
    try {
      const filterredData: any = fieldDefaultMetaData.data.dataSource.filter((t: any) => t.name.toLowerCase().startsWith(query.toLowerCase()));
      const transformedData = filterredData.map((e: any) => ({ label: e.name, value: e.name, type: e.type }));
      return transformedData
    } catch (error) {
      console.error(ERROR_MESSAGES.FETCHING_ITEMS, error);
      return []
    }
  };


  const serachDataSourceType = async (event: any) => {
    const query = event.query;
    try {

      const filterredData: any = fieldDefaultMetaData.data.dataSource.filter((t: any) => t.type.toLowerCase().startsWith(query.toLowerCase()));
      const transformedData = filterredData.map((e: any) => ({ label: e.type, value: e.type }))
      return transformedData;
    } catch (error) {
      console.error(ERROR_MESSAGES.FETCHING_ITEMS, error);
      return [];

    }
  };


  // useEffect(() => {
  //   if (modelMetaData) {
  //     setModelMetaData(modelMetaData.parentCategoryId);

  //     // formik.setFieldValue("parentCategoryId", modelMetaData.parentCategoryId);
  //   }
  // }, [modelMetaData])


  // Set the formik reference to the formik instance
  // Set the formik reference to the formik instance
  useEffect(() => {
    if (formikModelMetadataRef) {
      formikModelMetadataRef.current = formik; // Assign the formik instance to the ref
    }
  }, [formik, formikModelMetadataRef]);


  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1; // Increment count on every render
  });


  useEffect(() => {
    formik.validateForm();
    setModelMetaData(formik.values);

  }, [formik.values])

  useEffect(() => {
    if (formik.dirty) {
      setIsDirty(true);
    }
  }, [formik.dirty]);

  return (

    <>
      <Toast ref={toast} />
      <form onSubmit={formik.handleSubmit}>
        {/* <div className="form-wrapper-subtitle">Name</div> */}
        <div className="">
          <div className="grid formgrid">
            <div className="field col-12 lg:col-6 lg:pr-3">
              {/* <p className="form-wrapper-heading text-base">Basic Info</p> */}
              <Panel header={"Basic Info"} className="solid-column-panel">
                <div className="flex flex-column gap-2 mt-3">
                  <label htmlFor="type" className="form-field-label">
                    Module
                  </label>
                  <SingleSelectAutoCompleteField
                    disabled={params.id !== 'new'}
                    key="module"
                    formik={formik}
                    isFormFieldValid={isFormFieldValid}
                    relationField={true}
                    fieldName="module"
                    fieldNameId="moduleId"
                    labelKey="displayName"
                    valueKey="id"
                    searchData={searchModule}
                    existingData={formik.values.module}
                    formErrors={formErrors}
                    additionalAction={(e: any) => setSelectedModule(e.value)}
                  />
                  {(isFormFieldValid(formik, "module") || (formErrors["module"])) && (
                    <Message severity="error" text={formik?.errors?.moduleId?.toString()} />
                  )}
                </div>

                <div className="flex flex-column gap-2 mt-3 lg:mt-4">
                  <label htmlFor="dataSource" className="form-field-label">
                    Data Source
                  </label>
                  <SingleSelectAutoCompleteField
                    disabled={params.id !== 'new'}
                    key="dataSource"
                    formik={formik}
                    isFormFieldValid={isFormFieldValid}
                    // relationField={false}
                    fieldName="dataSource"
                    fieldNameId={null}
                    labelKey="label"
                    valueKey="value"
                    searchData={serachDataSource}
                    existingData={formik.values.dataSource}
                    additionalAction={(e: any) => formik.setFieldValue("dataSourceType", e.target.value.type)}
                    formErrors={formErrors}
                  />
                  {formik.values.dataSourceType && <p className="form-field-label text-sm">Your datasource will connect to a {formik.values.dataSourceType} database</p>}
                  {(isFormFieldValid(formik, "dataSource") || (formErrors["dataSource"])) && (
                    <Message severity="error" text={formik?.errors?.dataSource?.toString()} />
                  )}
                </div>


                {/* <div className="field col-12 flex flex-column gap-2 my-4">
                  <label htmlFor="dataSourceType" className="form-field-label">
                    Data Source Type
                  </label>
                  <SingleSelectAutoCompleteField
                            key="dataSourceType"
                            formik={formik}
                            isFormFieldValid={isFormFieldValid}
                            // relationField={false}
                            fieldName="dataSourceType"
                            fieldNameId={null}
                            labelKey="label"
                            valueKey="value"
                            searchData={serachDataSourceType}
                            existingData={formik.values.dataSourceType}
                          /> 
                  <InputText
                    disabled
                    type="text"
                    id="dataSourceType"
                    name="dataSourceType"
                    onChange={formik.handleChange}
                    value={formik.values.dataSourceType}
                    className={classNames("", {
                      "p-invalid": isFormFieldValid(formik, "dataSourceType"),
                    })}
                  />


                  {isFormFieldValid(formik, "dataSourceType") && (
                    <Message severity="error" text={formik?.errors?.dataSourceType?.toString()} />
                  )}
                </div>*/}
              </Panel>
              {/* <Divider /> */}
              {/* <p className="form-wrapper-heading text-base">Configurations</p> */}
              <Panel header={"Configurations"} className="solid-column-panel mt-3 mb-3 lg:mt-5">
                {/* {params.id === 'new' &&

                  <div className="field col-6">
                    <div className="flex align-items-center gap-2">
                      <Checkbox
                        disabled={params.id !== 'new'}
                        name="isSystem"
                        onChange={(e) => {
                          formik.setFieldValue("isSystem", e.checked);
                        }}
                        checked={formik.values.isSystem}
                      ></Checkbox>
                      <label htmlFor="isSystem" className="form-field-label">
                        Is System
                      </label>
                    </div>
                    {isFormFieldValid(formik, "isSystem") && (
                      <Message
                        severity="error"
                        text={formik?.errors?.isSystem?.toString()}
                      />
                    )}
                  </div>} */}
                <div className="flex align-items-center gap-2 mt-3">
                  <Checkbox
                    name="enableSoftDelete"
                    onChange={(e) => {
                      formik.setFieldValue("enableSoftDelete", e.checked);
                    }}
                    disabled={params.id !== 'new'}
                    checked={formik.values.enableSoftDelete}
                  ></Checkbox>
                  <label htmlFor="enableSoftDelete" className="form-field-label">
                    Enable Soft Delete
                  </label>
                </div>
                {params.id !== 'new' && <p className="form-field-label mt-1 text-sm">Soft-delete can only be set during initial creation to maintain data integrity</p>}
                {(isFormFieldValid(formik, "enableSoftDelete") || (formErrors["enableSoftDelete"])) && (
                  <Message
                    severity="error"
                    text={formik?.errors?.enableSoftDelete?.toString()}
                    className="mt-2"
                  />
                )}

                <div className="flex align-items-center gap-2 mt-3">
                  <Checkbox
                    name="isChild"
                    onChange={(e) => {
                      formik.setFieldValue("isChild", e.checked);
                    }}
                    disabled={params.id !== 'new'}
                    checked={formik.values.isChild}
                  ></Checkbox>
                  <label htmlFor="isChild" className="form-field-label">
                    Is Child
                  </label>
                </div>
                {params.id !== 'new' && <p className="form-field-label mt-1 text-sm">Is Current Model child of another Model</p>}
                {(isFormFieldValid(formik, "isChild") || (formErrors["isChild"])) && (
                  <Message
                    severity="error"
                    text={formik?.errors?.isChild?.toString()}
                    className="mt-2"
                  />
                )}
                {showParentModel &&
                  <div className="flex flex-column gap-2 mt-3">
                    <label htmlFor="type" className="form-field-label">
                      Parent Model
                    </label>
                    <SingleSelectAutoCompleteField
                      disabled={params.id !== 'new'}
                      key="parentModel"
                      formik={formik}
                      isFormFieldValid={isFormFieldValid}
                      relationField={true}
                      fieldName="parentModel"
                      fieldNameId="parentModelId"
                      labelKey="displayName"
                      valueKey="id"
                      searchData={searchModel}
                      existingData={formik.values.parentModel}
                      formErrors={formErrors}
                    />
                    {(isFormFieldValid(formik, "parentModel") || (formErrors["parentModel"])) && (
                      <Message severity="error" text={formik?.errors?.parentModelId?.toString()} />
                    )}
                  </div>
                }
                <div className="flex align-items-center gap-2 mt-3">
                  <Checkbox
                    name="enableAuditTracking"
                    onChange={(e) => {
                      formik.setFieldValue("enableAuditTracking", e.checked);
                    }}
                    checked={formik.values.enableAuditTracking}
                  ></Checkbox>
                  <label htmlFor="enableAuditTracking" className="form-field-label">
                    Enable Audit Tracking
                  </label>
                </div>
                {(isFormFieldValid(formik, "enableAuditTracking") || (formErrors["enableAuditTracking"])) && (
                  <Message
                    severity="error"
                    text={formik?.errors?.enableAuditTracking?.toString()}
                    className="mt-2"
                  />
                )}
                <div className="flex align-items-center gap-2 mt-3">
                  <Checkbox
                    name="internationalisation"
                    onChange={(e) => {
                      formik.setFieldValue("internationalisation", e.checked);
                    }}
                    checked={formik.values.internationalisation}
                  ></Checkbox>
                  <label htmlFor="internationalisation" className="form-field-label">
                    Is Internationalisation Enabled
                  </label>
                </div>
                <div className="flex align-items-center gap-2 mt-3">
                  <Checkbox
                    name="draftPublishWorkflow"
                    onChange={(e) => {
                      formik.setFieldValue("draftPublishWorkflow", e.checked);
                    }}
                    checked={formik.values.draftPublishWorkflow}
                  ></Checkbox>
                  <label htmlFor="draftPublishWorkflow" className="form-field-label">
                    Draft/Publish Workflow
                  </label>
                </div>
                <div className="flex align-items-center gap-2 mt-3">
                  <Checkbox
                    name="isLegacyTable"
                    onChange={(e) => {
                      formik.setFieldValue("isLegacyTable", e.checked);
                      // Reset isLegacyTableWithId when isLegacyTable is unchecked
                      if (!e.checked) {
                        formik.setFieldValue("isLegacyTableWithId", false);
                      }
                    }}
                    checked={formik.values.isLegacyTable}
                  ></Checkbox>
                  <label htmlFor="isLegacyTable" className="form-field-label">
                    Is Legacy Table
                  </label>
                </div>
                 {/* Conditionally show "Has existing Id" when "Is Legacy Table" is checked */}
                {formik.values.isLegacyTable && (
                  <div className="flex align-items-center gap-2 mt-2 ml-4">
                    <Checkbox
                      name="isLegacyTableWithId"
                      onChange={(e) => {
                        formik.setFieldValue("isLegacyTableWithId", e.checked);
                      }}
                      checked={formik.values.isLegacyTableWithId}
                    ></Checkbox>
                    <label htmlFor="isLegacyTableWithId" className="form-field-label">
                      Has existing Id
                    </label>
                  </div>
                )}
                {formik.values.isLegacyTable && (
                  <p className="form-field-label mt-2 text-sm">
                    Note: Legacy tables require at least one field marked as Primary Key during model creation
                  </p>
                )}
                {/* <div className="field col-6">
                  <div className="flex align-items-center gap-2 mt-3">
                    <Checkbox
                      name="enableAuditTracking"
                      onChange={(e) => {
                        formik.setFieldValue("enableAuditTracking", e.checked);
                      }}
                      checked={formik.values.enableAuditTracking}
                    ></Checkbox>
                    <label htmlFor="enableAuditTracking" className="form-field-label">
                      Enable Audit Tracking
                    </label>
                  </div>
                  {isFormFieldValid(formik, "enableAuditTracking") && (
                    <Message
                      severity="error"
                      text={formik?.errors?.enableAuditTracking?.toString()}
                    />
                  )}
                </div>
                <div className="field col-6">
                  <div className="flex align-items-center gap-2 mt-3">
                    <Checkbox
                      name="internationalisation"
                      onChange={(e) => {
                        formik.setFieldValue("internationalisation", e.checked);
                      }}
                      checked={formik.values.internationalisation}
                    ></Checkbox>
                    <label htmlFor="internationalisation" className="form-field-label">
                      Internationalisation
                    </label>
                  </div>
                  {isFormFieldValid(formik, "internationalisation") && (
                    <Message
                      severity="error"
                      text={formik?.errors?.internationalisation?.toString()}
                    />
                  )}
                </div>

                <div className="field col-6 mt-3">
                  <div className="flex align-items-center gap-2">
                    <Checkbox
                      name="isExportable"
                      onChange={(e) => {
                        formik.setFieldValue("isExportable", e.checked);
                      }}
                      checked={formik.values.isExportable}
                    ></Checkbox>
                    <label htmlFor="isExportable" className="form-field-label">
                      Is Exportable
                    </label>
                  </div>
                  {isFormFieldValid(formik, "isExportable") && (
                    <Message
                      severity="error"
                      text={formik?.errors?.isExportable?.toString()}
                    />
                  )}
                </div>
                <div className="field col-6 mt-3">
                  <div className="flex align-items-center gap-2">

                    <Checkbox onChange={e => {
                      setShowUserKeyField(e.checked);
                      formik.setFieldValue("hasUserKey", e.checked);
                    }} checked={showUserKeyField}></Checkbox>
                    <label htmlFor="ingredient1" className="form-field-label">
                      Has User Key
                    </label>
                  </div>
                  {showUserKeyField &&
                    <div className="formgrid grid">
                      <div className="field col-12 mt-3">
                        <label htmlFor="userKeyFieldId" className="form-field-label">
                          User Key Field
                        </label>
                        <InputText
                          type="text"
                          id="userKeyFieldId"
                          name="userKeyFieldId"
                          onChange={formik.handleChange}
                          value={formik.values.userKeyFieldId}
                          className={classNames("", {
                            "p-invalid": isFormFieldValid(formik, "userKeyFieldId"),
                          })}
                        />
                        {isFormFieldValid(formik, "userKeyFieldId") && (
                          <Message
                            severity="error"
                            text={formik?.errors?.userKeyFieldId?.toString()}
                          />
                        )}
                      </div>
                    </div>
                  }
                </div>*/}

              </Panel>

            </div>
            <div className="field col-12 lg:col-6 lg:pl-3">

              {/* <p className="form-wrapper-heading text-base">Basic Settings</p> */}
              <Panel header={"Basic Settings"} className="solid-column-panel">
                <div className="flex flex-column gap-2 mt-3">
                  <label htmlFor="displayName" className="form-field-label">
                    Display Name
                  </label>
                  <InputText
                    type="text"
                    id="displayName"
                    name="displayName"
                    onChange={(e) => {

                      formik.handleChange(e);
                      const { toCamelCase, toSnakeCase, toPluralCamelCase } = getSingularAndPlural(e.target.value);
                      if (params.id === 'new') {
                        formik.setFieldValue("singularName", toCamelCase);
                        formik.setFieldValue("pluralName", toPluralCamelCase);
                      }
                      if (params.id === 'new') {
                        formik.setFieldValue("tableName", toSnakeCase);
                      }


                    }}
                    value={formik.values.displayName}
                    className={classNames("", {
                      "p-invalid": isFormFieldValid(formik, "displayName") || formErrors["displayName"],
                    })}

                  />

                  {(isFormFieldValid(formik, "displayName") || (formErrors["displayName"])) && (
                    <Message
                      severity="error"
                      text={formik?.errors?.displayName?.toString()}
                    />
                  )}
                </div>
                <div className="flex flex-column gap-1 mt-4">
                  <label htmlFor="singularName" className="form-field-label">
                    Singular Name
                  </label>
                  <InputText
                    disabled={true}
                    type="text"
                    id="singularName"
                    name="singularName"
                    onChange={formik.handleChange}
                    value={formik.values.singularName}
                    className={classNames("", {
                      "p-invalid": isFormFieldValid(formik, "singularName") || formErrors["singularName"],
                    })}
                  />
                  {(isFormFieldValid(formik, "singularName") || (formErrors["singularName"])) && (
                    <Message
                      severity="error"
                      text={formik?.errors?.singularName?.toString()}
                    />
                  )}
                </div>
                <div className="flex flex-column gap-1 mt-4">
                  <label htmlFor="pluralName" className="form-field-label">
                    Plural Name
                  </label>
                  <InputText
                    disabled={true}
                    type="text"
                    id="pluralName"
                    name="pluralName"
                    onChange={formik.handleChange}
                    value={formik.values.pluralName}
                    className={classNames("", {
                      "p-invalid": isFormFieldValid(formik, "pluralName") || formErrors["pluralName"],
                    })}
                  />
                  {(isFormFieldValid(formik, "pluralName") || (formErrors["pluralName"])) && (
                    <Message severity="error" text={formik?.errors?.pluralName?.toString()} />
                  )}
                </div>

                {/* <div className="mt-4">
                  <div className="flex align-items-center gap-2">
                    <Checkbox onChange={e => {
                      setShowTableName(e.checked);
                      if (e.checked === true) {
                        const { toCamelCase, toSnakeCase, toPluralCamelCase } = getSingularAndPlural(formik.values.displayName);
                        if (params.id === 'new') {
                          formik.setFieldValue("tableName", toSnakeCase);
                        }
                      }

                    }} checked={showTableName} disabled={params.id !== 'new'}></Checkbox>
                    <label htmlFor="setTableName" className="form-field-label">
                      Set table name
                    </label>
                  </div>
                </div> */}
                {/* {showTableName && */}
                <div className="flex flex-column gap-1 mt-4">
                  <label htmlFor="tableName" className="form-field-label">
                    Table Name
                  </label>
                  <InputText
                    disabled={params.id !== 'new'}
                    type="text"
                    id="tableName"
                    name="tableName"
                    onChange={formik.handleChange}
                    value={formik.values.tableName}
                    className={classNames("", {
                      "p-invalid": isFormFieldValid(formik, "tableName") || formErrors["tableName"],
                    })}
                  />
                  {(isFormFieldValid(formik, "tableName") || (formErrors["tableName"])) && (
                    <Message
                      severity="error"
                      text={formik?.errors?.tableName?.toString()}
                    />
                  )}
                </div>
                {/* } */}
                <div className="flex flex-column gap-1 mt-4">
                  <label htmlFor="description" className="form-field-label">
                    Description
                  </label>
                  {/* <InputText
                      type="text"
                      id="description"
                      name="description"
                      onChange={formik.handleChange}
                      value={formik.values.description}
                      className={classNames("p-inputtext-sm w-full small-input", {
                        "p-invalid": isFormFieldValid(formik, "description"),
                      })}
                    /> */}
                  <InputTextarea
                    id="description"
                    name="description"
                    onChange={formik.handleChange}
                    value={formik.values.description}
                    className={classNames("", {
                      "p-invalid": isFormFieldValid(formik, "description") || formErrors["description"],
                    })}
                    rows={5}
                    cols={30}
                  />
                  {(isFormFieldValid(formik, "description") || (formErrors["description"])) && (
                    <Message
                      severity="error"
                      text={formik?.errors?.description?.toString()}
                    />
                  )}
                </div>
              </Panel>
            </div>

            {/* <div className="md:col-6 sm:col-12">
                  <div className="field">
                    <label htmlFor="pluralName" className="form-label form-field-label">
                      Plural Name
                    </label>
                    <InputText
                      type="text"
                      id="pluralName"
                      name="pluralName"
                      onChange={formik.handleChange}
                      value={formik.values.pluralName}
                      className={classNames("p-inputtext-sm w-full small-input", {
                        "p-invalid": isFormFieldValid(formik, "pluralName"),
                      })}
                    />
                    {isFormFieldValid(formik, "pluralName") && (
                      <Message severity="error" text={formik?.errors?.pluralName?.toString()} />
                    )}
                  </div>
                </div> */}


            {/* <div className="md:col-6 sm:col-12">
                  <div className="field form-dropdown-select">
                    <label htmlFor="dataSourceType" className="form-labe form-field-label">
                      Data Source
                    </label>
                    <Dropdown
                      id="dataSourceType"
                      name="dataSourceType"
                      value={formik.values.dataSourceType}
                      options={dataSourceTypes}
                      onChange={(e) => {
                        formik.setFieldValue("dataSourceType", e.value);
                        // if (e.value == "mariadb") {
                        //   formik.setFieldValue("dataSourceType", "mongodb");
                        // }
                        // else {
                        //   formik.setFieldValue("dataSourceType", "rdbms");
                        // }
                      }
                      }
                      placeholder="Select a Data Source"
                      className={classNames("p-inputtext-sm w-full", {
                        "p-invalid": isFormFieldValid(formik, "dataSource"),
                      })}
                    />
                    {isFormFieldValid(formik, "dataSource") && (
                      <Message severity="error" text={formik?.errors?.dataSource?.toString()} />
                    )}
                  </div>
                </div> */}


          </div>
        </div>
      </form>
    </>
  );
});

export default ModelMetaData;
