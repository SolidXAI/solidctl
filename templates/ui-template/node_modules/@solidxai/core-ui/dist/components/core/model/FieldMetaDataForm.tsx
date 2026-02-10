
import CodeEditor from "../../../components/common/CodeEditor";
import { SingleSelectAutoCompleteField } from "../../../components/common/SingleSelectAutoCompleteField";
import { getSingularAndPlural } from "../../../helpers/helpers";
import { useGetFieldDefaultMetaDataQuery } from "../../../redux/api/fieldApi";
import { useLazyGetMediaStorageProvidersQuery } from "../../../redux/api/mediaStorageProviderApi";
import { useLazyGetModelsQuery, useUpdateUserKeyMutation } from "../../../redux/api/modelApi";
import { useLazyGetmodulesQuery } from "../../../redux/api/moduleApi";
import { useFormik } from "formik";
import { capitalize } from "lodash";
import { usePathname } from "../../../hooks/usePathname";
import { AutoComplete } from "primereact/autocomplete";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import { Dropdown, DropdownChangeEvent } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { MultiSelect } from "primereact/multiselect";
import { RadioButton } from "primereact/radiobutton";
import { SelectButton } from "primereact/selectbutton";
import { TabPanel, TabView } from "primereact/tabview";
import { Toast } from "primereact/toast";
import { classNames } from "primereact/utils";
import qs from "qs";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Yup from "yup";
import FieldSelector from "./FieldSelector";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import { getVirtualScrollerOptions } from "../../../helpers/autoCompleteVirtualScroll";



enum SolidFieldType {
  // numeric types
  int = 'int',
  bigint = 'bigint',
  float = 'float',
  // double = 'double',
  decimal = 'decimal',

  // text types
  shortText = 'shortText',
  longtext = 'longText',
  richText = 'richText',
  json = 'json',

  // boolean types
  boolean = 'boolean',

  // date
  date = 'date',
  datetime = 'datetime',
  time = 'time',

  // relation
  relation = 'relation',

  // media
  mediaSingle = 'mediaSingle',
  mediaMultiple = 'mediaMultiple',

  email = 'email',
  password = 'password',

  // selection
  selectionStatic = 'selectionStatic',
  selectionDynamic = 'selectionDynamic',

  computed = 'computed',

  uuid = 'uuid'
}

const SelectionStaticValues = ({ enumValue, onUpdate, onDelete, onAdd }: any) => {
  const [value, display] = enumValue.split(":");

  const handleValueChange = (newValue: string) => {
    onUpdate(`${newValue}:${display || ""}`);
  };

  const handleDisplayChange = (newDisplay: string) => {
    onUpdate(`${value || ""}:${newDisplay}`);
  };

  return (
    <div className="flex align-items-center gap-2 mt-2">

      {/* Input field for Value */}
      <InputText
        value={value || ""}
        onChange={(e) => handleValueChange(e.target.value)}
        placeholder="Value"
        className="w-full"
      />

      {/* Input field for Display */}
      <InputText
        value={display || ""}
        onChange={(e) => handleDisplayChange(e.target.value)}
        placeholder="Display"
        className="w-full"
      />



      {/* Plus Button to add a new row */}
      <Button
        icon="pi pi-plus"
        size="small"
        onClick={onAdd}
        type="button"
      />

      {/* Trash Button to delete the row */}
      <Button
        icon="pi pi-trash"
        size="small"
        onClick={onDelete}
        outlined
        severity="danger"
        type="button"
      />
    </div>
  );

}

interface SelectComputedFieldTriggerValuesProps {
  index: number;
  row: {
    moduleName: string;
    modelName: string;
    operations: string[];
  };
  onChange: (index: number, updatedRow: any) => void;
  onDelete: (index: number) => void;
  isLastRow: boolean;
  disableDelete: boolean;
  formik: any;
  isFormFieldValid: (formik: any, field: string) => boolean;
  searchModuleName: (event: any) => Promise<any[]>;
  searchModelName: (event: any) => Promise<any[]>;
  modelMetaData?: any,
  errors?: any,
  touched?: any,
}

const triggerOperationOptions = [
  { label: "beforeInsert", value: "before-insert" },
  { label: "afterInsert", value: "after-insert" },
  { label: "beforeUpdate", value: "before-update" },
  { label: "afterUpdate", value: "after-update" },
  { label: "beforeRemove", value: "before-delete" },
  { label: "afterRemove", value: "after-delete" },
];

const formatDisplayName = (value: string): string => {
  return value
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};


const SelectComputedFieldTriggerValues: React.FC<SelectComputedFieldTriggerValuesProps> = ({
  index,
  row,
  onChange,
  onDelete,
  disableDelete,
  formik,
  isFormFieldValid,
  searchModuleName,
  searchModelName,
  modelMetaData,
  errors,
  touched,
}: any) => {
  const [filteredOperations, setFilteredOperations] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    if (!row.moduleName && modelMetaData?.module?.name) {
      formik.setFieldValue(`computedFieldTriggerConfig[${index}].moduleName`, modelMetaData?.module?.name);
    }
    if (!row.modelName && modelMetaData?.singularName) {
      formik.setFieldValue(`computedFieldTriggerConfig[${index}].modelName`, modelMetaData?.singularName);
    }
  }, [modelMetaData?.module?.name, modelMetaData?.singularName]);

  const searchOperations = (event: any) => {
    const query = event.query.toLowerCase();
    setFilteredOperations(
      triggerOperationOptions.filter((item) =>
        item.label.toLowerCase().includes(query)
      )
    );
  };

  return (
    <div className="flex align-items-start gap-3 mt-2 flex-wrap md:flex-nowrap">

      <div className="">
        <label
          htmlFor="moduleName"
          className="form-field-label"
        >
          Module
        </label>
        <div className="mt-2">
          <SingleSelectAutoCompleteField
            key={`moduleName-${index}`}
            formik={formik}
            isFormFieldValid={isFormFieldValid}
            fieldName={`computedFieldTriggerConfig[${index}].moduleName`}
            fieldNameId={`computedFieldTriggerConfig[${index}].moduleName`}
            labelKey="displayName"
            valueKey="name"
            searchData={searchModuleName}
            existingData={
              row.moduleName
                ? {
                  name: row.moduleName,
                  displayName: row.displayName || formatDisplayName(row.moduleName),
                }
                : modelMetaData?.module?.name
                  ? {
                    name: modelMetaData.module.name,
                    displayName: modelMetaData.module.displayName || formatDisplayName(modelMetaData.module.name),
                  }
                  : null
            }
          />
        </div>
        {errors?.moduleName && (
          <Message severity="error" text={errors.moduleName} />
        )}
      </div>

      <div className="">
        <label
          htmlFor="modelName"
          className="form-field-label"
        >
          Model
        </label>
        <div className="mt-2">
          <SingleSelectAutoCompleteField
            key={`modelName-${index}`}
            formik={formik}
            isFormFieldValid={isFormFieldValid}
            fieldName={`computedFieldTriggerConfig[${index}].modelName`}
            fieldNameId={`computedFieldTriggerConfig[${index}].modelName`}
            labelKey="displayName"
            valueKey="singularName"
            searchData={searchModelName}
            existingData={
              row.modelName
                ? {
                  singularName: row.modelName,
                  displayName: row.displayName || formatDisplayName(row.modelName),
                }
                : modelMetaData?.singularName
                  ? {
                    singularName: modelMetaData?.singularName,
                    displayName: modelMetaData?.displayName || formatDisplayName(modelMetaData.displayName),
                  }
                  : null
            }
          />
        </div>
        {errors?.modelName && (
          <Message severity="error" text={errors.modelName} />
        )}
      </div>


      {/* operations */}
      <div>
        <label
          htmlFor="operations"
          className="form-field-label"
        >
          Operations
        </label>
        <div className="mt-2">
          <AutoComplete
            multiple
            dropdown
            value={triggerOperationOptions.filter(opt => (row.operations || []).includes(opt.value))}
            suggestions={filteredOperations}
            completeMethod={searchOperations}
            field="label"
            onChange={(e) =>
              onChange(index, {
                ...row,
                operations: e.value.map((val: any) => val.value),
              })
            }
            placeholder="Select operations"
            className="solid-standard-autocomplete max-w-16rem"
          />
        </div>
        {errors?.operations && (
          <Message severity="error" text={errors.operations} />
        )}
      </div>

      {/* Trash Button to delete the row */}
      <Button
        icon="pi pi-trash"
        size="small"
        onClick={() => onDelete(index)}
        disabled={disableDelete}
        outlined
        severity="danger"
        type="button"
      />
    </div>
  );

}

const fieldBasedPayloadFormating = (values: any, currentFields: string[], fieldMetaData: any) => {
  // const booleanFields: string | any[] = [
  //   "isSystem",
  //   "defaultValue",
  //   "required",
  //   "unique",
  //   "encrypt",
  //   "index",
  //   "private",
  //   "relationCreateInverse"];
  const transformedPayload = currentFields.reduce((acc: any, key: any) => {
    acc[key] = values[key]; // Set key and its value as the same string
    // if (booleanFields.includes(acc[key])) {
    //   acc[key] = values[key] == "false" ? "" : true
    // }
    return acc;
  }, {});
  transformedPayload.displayName = transformedPayload.displayName.trim()

  transformedPayload.identifier = fieldMetaData ? fieldMetaData.identifier : Date.now();
  if (fieldMetaData?.id) {
    transformedPayload.id = fieldMetaData.id
  }
  if (currentFields.includes("mediaStorageProviderId")) {
    transformedPayload.mediaStorageProvider = values.mediaStorageProvider
  }
  if (currentFields.includes("selectionDynamicProviderCtxt")) {
    const prettified = JSON.stringify(JSON.parse(values.selectionDynamicProviderCtxt), null, 2);

    transformedPayload.selectionDynamicProviderCtxt = prettified
  }

  if (currentFields.includes("computedFieldValueProviderCtxt")) {
    const prettified = JSON.stringify(JSON.parse(values.computedFieldValueProviderCtxt), null, 2);
    transformedPayload.computedFieldValueProviderCtxt = prettified
  }

  if (currentFields.includes("computedFieldTriggerConfig")) {
    // const prettified = JSON.stringify(values.computedFieldTriggerConfig, null, 2);
    transformedPayload.computedFieldTriggerConfig = values.computedFieldTriggerConfig
  }

  if (currentFields.includes("relationCreateInverse")) {
    transformedPayload.relationCreateInverse = values.relationCreateInverse == false ? false : true
  }
  if (transformedPayload.relationType == "many-to-one") {
    transformedPayload.relationCascade = values.relationCascade;
  }

  if (transformedPayload.relationType == "many-to-many") {
    transformedPayload.isRelationManyToManyOwner = true;
  }
  return transformedPayload

}

function fetchCurrentFields(solidFieldType: any, fieldDefaultMetaData: any) {

  if (solidFieldType) {
    const allowedFields = fieldDefaultMetaData?.data?.fieldTypes.filter((e: any) => e.fieldType === solidFieldType);
    if (allowedFields.length > 0) {
      return allowedFields[0].fields
    }

  }
  return [
    "name",
    "displayName",
    "type",
    "ormType",
    "required",
    "unique",
    "index",
    "private",
    "encrypt",
    "isUserKey"
  ];

}

const createValidationSchema = (currentFields: any, selectedType: any, allFields: any, fieldMetaData: any, encryptState: any) => {

  let reservedNames;

  if (fieldMetaData) {
    reservedNames = allFields.length > 0 ? allFields.filter((i: any) => i.id !== fieldMetaData.id).map((f: any) => f.name) : [];
  } else {

    reservedNames = allFields.length > 0 ? allFields.map((f: any) => f.name) : [];
  }



  const schema = {
    name: Yup.string()
      // .matches(/^[a-z]+(-[a-z]+)*$/,"Invalid format. Use lowercase letters and hyphens only")
      .notOneOf(reservedNames, ERROR_MESSAGES.FIELD_ALREADY_USE('Name', 'name'))
      .required(ERROR_MESSAGES.FIELD_REUQIRED('Name')),
    displayName: Yup.string().required(ERROR_MESSAGES.FIELD_REUQIRED('Display Name')),
    description: Yup.string().nullable(),
    type: Yup.string().required(ERROR_MESSAGES.FIELD_REUQIRED('Type')),
    isSystem: Yup.boolean(),
    // Conditionally add validation rules based on `currentFields`
    ...(currentFields.includes("ormType") && {
      ormType: Yup.string().required(ERROR_MESSAGES.FIELD_REUQIRED('Orm Type')),
    }),
    ...(currentFields.includes("length") && {
      length: Yup.number().typeError(ERROR_MESSAGES.FIELD_MUST_BE_AN('Length', 'interger')).nullable(),
    }),
    // ...(currentFields.includes("defaultValue") && {
    //   defaultValue: Yup.string().required("Default Value is required"),
    // }),
    // Conditionally validate defaultValue based on SolidFieldType
    ...(currentFields.includes("defaultValue") && {
      defaultValue: Yup.mixed().nullable().when("type", (type: any) => {
        switch (selectedType.value) {
          case "int":
          case "bigint":
            return Yup.number().nullable().typeError(ERROR_MESSAGES.FIELD_MUST_BE_AN('Default value', 'integer'))
              .integer(ERROR_MESSAGES.FIELD_MUST_BE_AN('Default value', 'integer'));
          case "float":
          case "decimal":
            return Yup.number().nullable().typeError(ERROR_MESSAGES.FIELD_MUST_BE_AN('Default value', 'integer'))
          case "shortText":
          case "longText":
          case "richText":
          case "json":
            return Yup.string().nullable().typeError(ERROR_MESSAGES.FIELD_MUST_BE_AN('Default value', 'boolean'))
          case "boolean":
            return Yup.boolean().nullable().typeError(ERROR_MESSAGES.FIELD_MUST_BE_AN('Default value', 'boolean'))
          case "date":
          case "datetime":
          case "time":
            return Yup.date().nullable().typeError(ERROR_MESSAGES.FIELD_MUST_BE_AN('Default value', 'Date'))
          default:
            return Yup.mixed().nullable(); // Default fallback if no match
        }
      }),
    }),

    // Add more conditional fields as needed

    ...(currentFields.includes("regexPattern") && {
      regexPattern: Yup.string(),
      regexPatternNotMatchingErrorMsg: Yup.string(),
    }),
    ...(currentFields.includes("required") && {
      required: Yup.boolean(),
    }),
    ...(currentFields.includes("unique") && {
      unique: Yup.boolean(),
    }),
    ...(currentFields.includes("encrypt") && {
      encrypt: Yup.boolean(),
    }),
    ...(currentFields.includes("encryptionType") && encryptState == true && {
      encryptionType: Yup.string().required(
        ERROR_MESSAGES.FIELD_REUQIRED('Encryption Type Value')
      ),
    }),
    ...(currentFields.includes("decryptWhen") && encryptState == true && {

      decryptWhen: Yup.string().required(ERROR_MESSAGES.FIELD_REUQIRED('Decrypt When Value')),
    }),
    ...(currentFields.includes("index") && {
      index: Yup.boolean(),
    }),
    // ...(currentFields.includes("min") && {
    //   min: Yup.number().required("Min is required"),
    // }),
    ...(currentFields.includes("min") && {
      min: Yup.mixed().nullable()
        .when("type", (type: any) => {
          switch (selectedType.value) {
            case "int":
              return Yup.number().nullable().typeError(ERROR_MESSAGES.FIELD_MUST_BE_AN('Min', 'interger'))
                .integer(ERROR_MESSAGES.FIELD_MUST_BE_AN('Min', 'interger'));
            case "decimal":
            case "shortText":
            case "longText":
            case "richText":
            case "json":
              return Yup.number().nullable().typeError(ERROR_MESSAGES.FIELD_MUST_BE_AN('Min', 'interger'));
            default:
              return Yup.mixed().nullable().nullable(); // Default fallback if no match
          }
        }),
    }),
    // ...(currentFields.includes("max") && {
    //   max: Yup.number().required("Max is required"),
    // }),
    ...(currentFields.includes("max") && {
      max: Yup.mixed()
        .when("type", (type: any) => {
          switch (selectedType.value) {
            case "int":
              return Yup.number().nullable().typeError(ERROR_MESSAGES.FIELD_MUST_BE_AN('Max', 'interger'))
                .integer(ERROR_MESSAGES.FIELD_MUST_BE_AN('Max', 'interger'))
                .test(
                  ERROR_MESSAGES.GREATER_THAN_MIN,
                  ERROR_MESSAGES.FIELD_MUST_BE_AN('Max', 'greater than Min'),
                  function (value) {
                    const { min } = this.parent; // Access sibling field 'min'
                    // if (min != null && value == null) {
                    //   // Trigger error if Min is filled but Max is empty
                    //   return this.createError({
                    //     message: "Max is required if Min is specified",
                    //   });
                    // }
                    return value == null || value > min; // Validate only if Max exists
                  }
                );


            case "decimal":
            case "shortText":
            case "longText":
            case "richText":
            case "json":
              return Yup.number().nullable().typeError(ERROR_MESSAGES.FIELD_MUST_BE_AN('Max', 'interger'))
                .test(
                  ERROR_MESSAGES.GREATER_THAN_MIN,
                  ERROR_MESSAGES.FIELD_MUST_BE_AN('Max', 'greater than Min'),
                  function (value) {
                    const { min } = this.parent; // Access sibling field 'min'
                    // if (min != null && value == null) {
                    //   // Trigger error if Min is filled but Max is empty
                    //   return this.createError({
                    //     message: "Max is required if Min is specified",
                    //   });
                    // }
                    return value == null || value > min; // Validate only if Max exists
                  }
                );


            default:
              return Yup.mixed().nullable().nullable(); // Default fallback if no match
          }
        }),
    }),
    ...(currentFields.includes("private") && {
      private: Yup.boolean(),
    }),
    ...(currentFields.includes("mediaTypes") && {
      mediaTypes: Yup.mixed().required(ERROR_MESSAGES.FIELD_MUST_BE_AN('Media Types', 'Arrays')).required(ERROR_MESSAGES.FIELD_REUQIRED('Media Types')),
    }),

    ...(currentFields.includes("mediaMaxSizeKb") && {
      mediaMaxSizeKb: Yup.number().required(ERROR_MESSAGES.FIELD_REUQIRED('Media Max Size')),
    }),
    ...(currentFields.includes("mediaStorageProviderId") && {
      mediaStorageProviderId: Yup.number().required(
        ERROR_MESSAGES.FIELD_REUQIRED('Media Storage Provider')
      ),
    }),
    ...(currentFields.includes("mediaStorageProviderId") && {
      mediaStorageProvider: Yup.object().required(
        ERROR_MESSAGES.FIELD_REUQIRED('Media Storage Provider')
      ),
    }),

    ...(currentFields.includes("mediaEmbedded") && {
      mediaEmbedded: Yup.boolean(),
    }),
    ...(currentFields.includes("relationType") && {
      relationType: Yup.string().required(ERROR_MESSAGES.FIELD_REUQIRED('Relation Type ')),
    }),
    ...(currentFields.includes("relationCoModelSingularName") && {
      relationCoModelSingularName: Yup.string().required(
        ERROR_MESSAGES.FIELD_REUQIRED('Relation Model Singular Name')
      ),
    }),
    ...(currentFields.includes("relationCoModelFieldName") && {
      relationCoModelFieldName: Yup.string()
      // .required(
      //   "Relation Model Field Name is required"
      // ),
    }),
    ...(currentFields.includes("relationCreateInverse") && {
      relationCreateInverse: Yup.boolean(),
    }),
    ...(currentFields.includes("relationCoModelFieldName") && {
      relationCoModelFieldName: Yup.string().when("relationCreateInverse", (relationCreateInverse: any, schema) => {
        if (relationCreateInverse.length > 0 && relationCreateInverse[0] == true) {
          return schema.required(ERROR_MESSAGES.FIELD_REUQIRED('Relation Co Model Field Name'))
        } else {
          return schema.notRequired();
        }
      }),
    }),

    // ...(currentFields.includes("relationCascade") && {
    //   relationCascade: Yup.string().required(
    //     "Relation Cascade Value is required"
    //   ),
    // }),

    // Conditionally validate relationCascade based on relationType
    ...(currentFields.includes("relation") && {
      relationCascade: Yup.string().when("relationType", (relationType: any, schema) => {
        return relationType === "one-to-one"
          ? schema.required(ERROR_MESSAGES.RELATION_CASCADE)
          : schema.notRequired();
      }),
    }),


    ...(currentFields.includes("relationModelModuleName") && {
      relationModelModuleName: Yup.string().required(
        ERROR_MESSAGES.FIELD_REUQIRED('Relation Model Module Name Value')
      ),
    }),

    ...(currentFields.includes("relationFieldFixedFilter") && {
      relationFieldFixedFilter: Yup.string().nullable(),
    }),

    ...(currentFields.includes("selectionDynamicProvider") && {
      selectionDynamicProvider: Yup.string().required(
        ERROR_MESSAGES.FIELD_REUQIRED('Selection Dynamic Provider Value ')
      ),
    }),
    ...(currentFields.includes("selectionDynamicProviderCtxt") && {
      selectionDynamicProviderCtxt: Yup.string().required(
        ERROR_MESSAGES.FIELD_REUQIRED('Selection Dynamic Provider Context Value')
      ).test(
        ERROR_MESSAGES.IS_VALID_JSON,
        ERROR_MESSAGES.COMPUTED_FIELD_VALIDATE_JSON,
        (value) => {
          if (!value) return false; // Ensure it's required
          try {
            JSON.parse(value); // Check if it's valid JSON
            return true;
          } catch {
            return false;
          }
        }
      ),
    }),

    ...(currentFields.includes("selectionStaticValues") && {
      selectionStaticValues: Yup.array().of(
        Yup.string().matches(/^[\w\s\d-]+:[\w\s-]+$/, ERROR_MESSAGES.FIELD_REUQIRED('Label and Value'))
      ),
    }),
    ...(currentFields.includes("computedFieldValueProvider") && {
      computedFieldValueProvider: Yup.string().required(
        ERROR_MESSAGES.FIELD_REUQIRED('Computed Field Function Value')
      ),
    }),
    ...(currentFields.includes("computedFieldValueProviderCtxt") && {
      computedFieldValueProviderCtxt: Yup.string().required(
        ERROR_MESSAGES.FIELD_REUQIRED('"Computed Field Value Provider Context Value')
      ).test(
        ERROR_MESSAGES.IS_VALID_JSON,
        ERROR_MESSAGES.COMPUTED_FIELD_VALIDATE_JSON,
        (value) => {
          if (!value) return false; // Ensure it's required
          try {
            JSON.parse(value); // Check if it's valid JSON
            return true;
          } catch {
            return false;
          }
        }
      ),

    }),
    ...(currentFields.includes("computedFieldValueType") && {
      computedFieldValueType: Yup.string().required(
        ERROR_MESSAGES.FIELD_REUQIRED('Computed Field Value Type')
      ),
    }),
    ...(currentFields.includes("computedFieldTriggerConfig") && {
      computedFieldTriggerConfig: Yup.array()
        .of(
          Yup.object().shape({
            moduleName: Yup.string().required(ERROR_MESSAGES.FIELD_REUQIRED('Module name')),
            modelName: Yup.string().required(ERROR_MESSAGES.FIELD_REUQIRED('Model name')),
            operations: Yup.array().of(Yup.string()).min(1, ERROR_MESSAGES.SELECT_ONE_OPERATION),
          })
        )
        .min(1, ERROR_MESSAGES.FIELD_REUQIRED('At least one trigger config'))
        .required(ERROR_MESSAGES.FIELD_REUQIRED('Computed Field Trigger Config')),
    }),

    // ...(currentFields.includes("columnName") && { columnName: Yup.string().nullable().matches(/^[a-z0-9_]+$/, ERROR_MESSAGES.SNAKE_CASE('column')), }),
    ...(currentFields.includes("isPrimaryKey") && { isPrimaryKey: Yup.boolean(), }),

    ...(currentFields.includes("required") && {
      required: Yup.boolean().when("isPrimaryKey", (isPrimaryKey: any, schema) => {
        if (isPrimaryKey.length > 0 && isPrimaryKey[0] === true) {
          return schema.oneOf([true], "Required must be true when field is marked as Primary Key");
        }
        return schema;
      }),
    }),

    ...(currentFields.includes("unique") && {
      unique: Yup.boolean().when("isPrimaryKey", (isPrimaryKey: any, schema) => {
        if (isPrimaryKey.length > 0 && isPrimaryKey[0] === true) {
          return schema.oneOf([true], "Unique must be true when field is marked as Primary Key");
        }
        return schema;
      }).when("required", (required: any, schema) => {
        // Disallow unique field that is not required
        if (required.length > 0 && required[0] === false) {
          return schema.oneOf([false], "Unique fields must also be marked as Required");
        }
        return schema;
      }),
    }),


    // ...(currentFields.includes("externalIdProvider") && {
    //   externalIdProvider: Yup.string().required(
    //     "ExternalId Provider Value is required"
    //   ),
    // }),
    // ...(currentFields.includes("externalIdProviderCtxt") && {
    //   externalIdProviderCtxt: Yup.string().required(
    //     "EexternalId Provider Context Value is required"
    //   ),
    // }),
  };

  return Yup.object(schema);
};

const FieldMetaDataForm = ({ setIsDirty, modelMetaData, fieldMetaData, setFieldMetaData, allFields, deleteModelFunction, setVisiblePopup, params, setIsRequiredPopUp, showToaster }: any) => {
  const booleanOptions = ["false", "true"];
  const [isBackPopupVisible, setIsBackPopupVisible] = useState(false);
  const [showColumnName, setShowColumnName] = useState<any>(false);

  const pathname = usePathname();

  const toast = useRef<Toast>(null);
  const { data: fieldDefaultMetaData, isLoading, error, refetch } = useGetFieldDefaultMetaDataQuery(null);
  const [currentFields, setCurrentFields] = useState(
    fetchCurrentFields(fieldMetaData && fieldMetaData.type, fieldDefaultMetaData)
  );

  const [triggerGetMediaStorageProvider, { data: MediaStorageProviderData, isFetching: isMediaStorageProviderFetching, error: MediaStorageProviderError }] = useLazyGetMediaStorageProvidersQuery();
  const [triggerGetModules, { data: moduleData, isFetching: isModuleFetching, error: moduleError }] = useLazyGetmodulesQuery();
  const [triggerGetModels, { data: modelData, isFetching: ismodelFetching, error: modelError }] = useLazyGetModelsQuery();
  const [
    updateUserKey,
    { isLoading: isUpdateUserKeyLoading, isSuccess: isUpdateUserKeySuccess, isError: isUpdateUserKeyError, error: UpdateUserKeyError, data: newModel },
  ] = useUpdateUserKeyMutation();


  const [markdownText, setMarkdownText] = useState<string>();
  const [encryptState, setEncryptState] = useState<any>(false);

  const [showTypeFilter, setShowTypeFilter] = useState(fieldMetaData ? false : true);
  const [selectedType, setSelectedType] = useState(fieldMetaData?.type && { label: fieldMetaData?.type, value: fieldMetaData?.type });
  const [selectedComputedFieldValueType, setSelectedComputedFieldValueType] = useState(fieldMetaData?.computedFieldValueType && { label: fieldMetaData.computedFieldValueType, value: fieldMetaData.computedFieldValueType });
  const [selectionDynamicProvider, setSelectionDynamicProvider] = useState(fieldMetaData?.selectionDynamicProvider && { label: fieldMetaData.selectionDynamicProvider, value: fieldMetaData.selectionDynamicProvider });
  // const [externalIdProvider, setExternalIdProvider] = useState(fieldMetaData?.externalIdProvider && { label: fieldMetaData.externalIdProvider, value: fieldMetaData.externalIdProvider });
  const [selectionStaticValues, setSelectionStaticValues] = useState(fieldMetaData && fieldMetaData.selectionStaticValues && fieldMetaData.selectionStaticValues.length > 0 && fieldMetaData?.selectionStaticValues.filter((line: any) => line.trim() !== "").join("\n"));
  const [filteredComputedFieldValueTypes, setFilteredComputedFieldValueTypes] = useState([]);
  const [
    filteredSelectionDynamicProvider,
    setFilteredSelectionDynamicProvider,
  ] = useState([]);

  const [ormTypeOptions, setOrmTypeOptions] = useState([]);
  const [selectedOrmType, setSelectedOrmType] = useState<any>(fieldMetaData?.ormType);

  const [askForUserKeyField, setAskForUserKeyField] = useState(false);
  const [userKeyFieldData, setUserKeyFieldData] = useState([]);

  const [
    filteredExternalIdProvider,
    setFilteredExternalIdProvider,
  ] = useState([]);

  const [filteredSelectionEncryptionType, setFilteredSelectionEncryptionType] = useState([]);

  const [filteredSelectionDecryptWhen, setFilteredSelectionDecryptWhen] = useState([]);

  const items = Array.from({ length: 100000 }).map((_, i) => ({
    label: `Item #${i}`,
    value: i,
  }));

  const validationSchema = React.useMemo(
    () => createValidationSchema(currentFields, selectedType, allFields, fieldMetaData, encryptState),
    [currentFields, encryptState]
  );

  const [typeSelected, setTypeSelected] = useState(false);


  const searchMediaTypes = async (event: any) => {
    const query = event.query;
    try {
      const suggestionData: any = fieldDefaultMetaData.data.mediaTypes.filter((t: any) => t.label.toLowerCase().startsWith(query.toLowerCase()));
      return suggestionData;
    } catch (error) {
      console.error(ERROR_MESSAGES.FETCHING_ITEMS, error);
      return []
    }
  };

  const searchMediaStorageProvIderId = async (event: any) => {
    try {
      const query = event.query;
      const queryData = {
        limit: 10,
        offset: 0,
        // filters: {
        //   name: {
        //     $containsi: query,
        //   },
        // },
      };

      const queryString = qs.stringify(queryData, {
        encodeValuesOnly: true,
      });

      const result = await triggerGetMediaStorageProvider(queryString).unwrap();

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
    const query = event.query;
    const queryData = {
      limit: 10,
      offset: 0,
      // filters: {
      //   title: {
      //     $containsi: query
      //   }
      // }
    };

    const queryString = qs.stringify(queryData, {
      encodeValuesOnly: true
    });

    // Trigger the API call manually
    const result = await triggerGetModels(queryString).unwrap(); // Unwrap to access the data

    // Map the API response to AutoComplete format
    if (result && result.records) {
      const filteredMenu = result.records.map((m: any) => (
        {
          label: m.name,
          value: m.id,
          name: m.name,
          id: m.id,
        }
      ));

      // Update the suggestions in state
      return filteredMenu
    } else {
      // Handle the case where no data is returned
      return []
    }
  };




  const searchOrmTypes = async (event: any) => {
    const query = event.query;
    try {

      const ormType = fieldDefaultMetaData.data.ormType[modelMetaData?.dataSourceType];
      const _filteredOrmType = ormType[formik.values.type].ormTypes.map((e: any) => ({ label: e, value: e }))

      const suggestionData: any = _filteredOrmType.filter((t: any) => t.label.toLowerCase().startsWith(query.toLowerCase()));
      return suggestionData
    } catch (error) {
      console.error(ERROR_MESSAGES.FETCHING_ITEMS, error);
      return []
    }
  };




  const searchRelationModelModuleNames = async (event: any) => {
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

      const result = await triggerGetModules(queryString).unwrap(); // Unwrap to access the data

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

  const searchrelationCoModelSingularNames = async (event: any) => {
    try {
      const query = event.query;
      const queryData: any = {
        limit: 10,
        offset: 0,
        filters: {
          module: {
            name: {
              $containsi: formik.values.relationModelModuleName
            }
          }
        }
      };
      if (query) {
        queryData.filters.singularName = {
          $containsi: query,
        };
      }
      const queryString = qs.stringify(queryData, {
        encodeValuesOnly: true,
      });

      const result = await triggerGetModels(queryString).unwrap(); // Unwrap to access the data

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

  const searchModuleName = async (event: any) => {
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

      const result = await triggerGetModules(queryString).unwrap(); // Unwrap to access the data

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

  const getSearchModelNameHandler = useCallback(
    (moduleName: string) => {
      return async (event: any) => {
        try {
          const query = event.query;
          const queryData: any = {
            limit: 10,
            offset: 0,
            filters: {
              module: {
                name: {
                  $containsi: moduleName,
                },
              },
            },
          };

          if (query) {
            queryData.filters.singularName = {
              $containsi: query,
            };
          }

          const queryString = qs.stringify(queryData, { encodeValuesOnly: true });
          const result = await triggerGetModels(queryString).unwrap();
          return result?.records ?? [];
        } catch (error) {
          return [];
        }
      };
    },
    [] // or include dependencies like triggerGetModels if needed
  );

  const searchUserKeyField = () => {
    return userKeyFieldData;
  }

  const searchComputedFieldValueType = async (event: any) => {
    const query = event.query;
    try {

      const _filteredTypes: any = fieldDefaultMetaData.data.computedFieldValueTypes.filter((t: any) => t.label.toLowerCase().startsWith(query.toLowerCase()));

      setFilteredComputedFieldValueTypes(_filteredTypes);
    } catch (error) {
      console.error(ERROR_MESSAGES.FETCHING_ITEMS, error);
      setFilteredComputedFieldValueTypes([]);
    }
  };



  const searchSelectionDynamicProvider = async (event: any) => {
    const query = event.query;
    try {
      const filterredData: any = fieldDefaultMetaData.data.selectionDynamicProviders.filter((t: any) => t.provider.toLowerCase().startsWith(query.toLowerCase()));
      const transformedData = filterredData.map((e: any) => ({ label: e.provider, value: e.provider, help: e.help }));
      return transformedData
    } catch (error) {
      console.error(ERROR_MESSAGES.FETCHING_ITEMS, error);
      return []
    }
  };



  const searchComputedProvider = async (event: any) => {
    const query = event.query;
    try {
      const filterredData: any = fieldDefaultMetaData.data.computedProviders.filter((t: any) => t.provider.toLowerCase().startsWith(query.toLowerCase()));
      const transformedData = filterredData.map((e: any) => ({ label: e.provider, value: e.provider, help: e.help }));
      return transformedData
    } catch (error) {
      console.error(ERROR_MESSAGES.FETCHING_ITEMS, error);
      return []
    }
  };

  const searchExternalIdProvider = async (event: any) => {
    const query = event.query;
    try {
      const filterredData: any = fieldDefaultMetaData.data.externalIdProviders.filter((t: any) => t.provider.toLowerCase().startsWith(query.toLowerCase()));
      const transformedData = filterredData.map((e: any) => ({ label: e.provider, value: e.provider, help: e.help }));
      return transformedData
    } catch (error) {
      console.error(ERROR_MESSAGES.FETCHING_ITEMS, error);
      return []
    }
  };



  const searchSelectionEncryptionType = async (event: any) => {
    const query = event.query;
    try {

      const _filteredTypes: any = fieldDefaultMetaData.data.encryptionTypes.filter((t: any) => t.label.toLowerCase().startsWith(query.toLowerCase()));

      setFilteredSelectionEncryptionType(_filteredTypes);
      return _filteredTypes
    } catch (error) {
      console.error(ERROR_MESSAGES.FETCHING_ITEMS, error);
      setFilteredSelectionEncryptionType([]);
      return []
    }
  };

  const searchSelectionDecryptWhen = async (event: any) => {
    const query = event.query;
    try {

      const _filteredTypes: any = fieldDefaultMetaData.data.decryptWhenTypes.filter((t: any) => t.label.toLowerCase().startsWith(query.toLowerCase()));

      setFilteredSelectionDecryptWhen(_filteredTypes);
      return _filteredTypes
    } catch (error) {
      console.error(ERROR_MESSAGES.FETCHING_ITEMS, error);
      setFilteredSelectionDecryptWhen([]);
      return []
    }
  };


  const isFormFieldValid = (formik: any, fieldName: string) => {
    return formik.touched[fieldName] && formik.errors[fieldName];
  };


  const mediaStorageProviderId = [
    { label: "mediaStorageProviderId", value: "mediaStorageProviderId" },
    { label: "id2", value: "2" },
  ];

  const selctionValueTypes = [
    { label: "String", value: "string" },
    { label: "Int", value: "int" },
  ];


  const relationCreateInverses = [
    { label: "True", value: "true" },
    { label: "False", value: "false" },
  ];

  const [selectedPasswordPolicy, setSelectedPasswordPolicy] = useState<any>(fieldMetaData?.regexPattern);
  const passwordPolicyOptions = [
    { label: 'Lowercase and Uppercase Alphabets Required', value: '^(?=.*[a-z])(?=.*[A-Z]).*$' },
    { label: 'Lowercase and Uppercase Alphabets and Numbers Required', value: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$' },
    { label: 'Lowercase and Uppercase Alphabets, Numbers, and Special Characters Required', value: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).*$' },
    { label: 'custom', value: 'custom' },

  ];

  const mediaTypesOptions = [
    { label: 'Image (Supports JPEG, PNG, WEBP, etc.)', value: 'image' },
    { label: 'Audio (Supports MP3, WAV, AAC, etc.)', value: 'audio' },
    { label: 'Video (Supports MP4, AVI, MKV, etc.)', value: 'video' },
    { label: 'File (Supports PDF, DOCX, TXT, etc.)', value: 'file' }
  ];


  const parseComputedFieldTriggerConfig = (input: any) => {
    try {
      if (typeof input === "string") {
        const parsed = JSON.parse(input);
        return Array.isArray(parsed) ? parsed : [parsed];
      } else if (Array.isArray(input)) {
        return input;
      } else if (typeof input === "object" && input !== null) {
        return [input];
      }
    } catch {
      return [{ moduleName: "", modelName: "", operations: [] }];
    }

    return [{ moduleName: "", modelName: "", operations: [] }];
  };


  const initialValues = {
    name: fieldMetaData ? fieldMetaData?.name : null,
    displayName: fieldMetaData ? fieldMetaData?.displayName : null,
    description: fieldMetaData ? fieldMetaData?.description : null,
    type: fieldMetaData ? fieldMetaData?.type : null,
    ormType: fieldMetaData ? fieldMetaData?.ormType : null,
    length: fieldMetaData ? fieldMetaData?.length : null,
    defaultValue: fieldMetaData ? fieldMetaData?.defaultValue : null,
    regexPattern: fieldMetaData ? fieldMetaData?.regexPattern : null,
    regexPatternNotMatchingErrorMsg: fieldMetaData ? fieldMetaData?.regexPatternNotMatchingErrorMsg : "Invalid regex pattern",
    required: fieldMetaData ? fieldMetaData?.required : false,
    unique: fieldMetaData ? fieldMetaData?.unique : false,
    encrypt: fieldMetaData ? fieldMetaData?.encrypt : false,
    encryptionType: fieldMetaData ? fieldMetaData?.encryptionType : null,
    decryptWhen: fieldMetaData ? fieldMetaData?.decryptWhen : null,
    index: fieldMetaData ? fieldMetaData?.index : false,
    min: fieldMetaData ? fieldMetaData?.min : null,
    max: fieldMetaData ? fieldMetaData?.max : null,
    private: fieldMetaData ? fieldMetaData?.private : false,
    mediaTypes: fieldMetaData ? fieldMetaData?.mediaTypes : null,
    mediaMaxSizeKb: fieldMetaData ? fieldMetaData?.mediaMaxSizeKb : null,
    mediaStorageProviderId: fieldMetaData ? fieldMetaData?.mediaStorageProvider?.id : null,
    mediaStorageProvider: fieldMetaData ? fieldMetaData?.mediaStorageProvider : null,
    mediaEmbedded: fieldMetaData ? (fieldMetaData?.mediaEmbedded && fieldMetaData?.mediaEmbedded.toString()) : "true",
    relationType: fieldMetaData ? fieldMetaData?.relationType : null,
    relationCoModelSingularName: fieldMetaData ? fieldMetaData?.relationCoModelSingularName : null,
    relationCoModelFieldName: fieldMetaData ? fieldMetaData?.relationCoModelFieldName : null,
    relationCreateInverse: fieldMetaData ? fieldMetaData?.relationCreateInverse : false,
    relationCascade: fieldMetaData ? fieldMetaData?.relationCascade : 'cascade',
    relationModelModuleName: fieldMetaData ? fieldMetaData?.relationModelModuleName : modelMetaData?.module.name,
    relationFieldFixedFilter: fieldMetaData ? fieldMetaData?.relationFieldFixedFilter : "",
    selectionDynamicProvider: fieldMetaData ? fieldMetaData?.selectionDynamicProvider : null,
    selectionDynamicProviderCtxt: fieldMetaData ? fieldMetaData?.selectionDynamicProviderCtxt : "",
    selectionStaticValues: fieldMetaData ? fieldMetaData?.selectionStaticValues : [""],
    selectionValueType: fieldMetaData ? fieldMetaData?.selectionValueType : null,
    computedFieldValueProvider: fieldMetaData ? fieldMetaData?.computedFieldValueProvider : null,
    computedFieldValueType: fieldMetaData ? fieldMetaData?.computedFieldValueType : null,
    computedFieldTriggerConfig: parseComputedFieldTriggerConfig(fieldMetaData?.computedFieldTriggerConfig),
    computedFieldValueProviderCtxt: fieldMetaData ? fieldMetaData?.computedFieldValueProviderCtxt : "",
    // externalIdProvider: fieldMetaData ? fieldMetaData?.externalIdProvider : null,
    // externalIdProviderCtxt: fieldMetaData ? fieldMetaData?.externalIdProviderCtxt : "",
    isSystem: fieldMetaData ? fieldMetaData?.isSystem : false,
    columnName: fieldMetaData ? fieldMetaData?.columnName : null,
    isUserKey: fieldMetaData ? fieldMetaData?.isUserKey : false,
    relationCoModelColumnName: fieldMetaData ? fieldMetaData?.relationCoModelColumnName : null,
    relationJoinTableName: fieldMetaData ? fieldMetaData?.relationJoinTableName : null,
    userKey: fieldMetaData ? fieldMetaData?.userKey : null,
    enableAuditTracking: fieldMetaData ? fieldMetaData?.enableAuditTracking : true,
    isPrimaryKey: fieldMetaData ? fieldMetaData?.isPrimaryKey : false,
    isMultiSelect: fieldMetaData ? fieldMetaData?.isMultiSelect : false,
  };


  const formik = useFormik({
    initialValues,
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        setFieldMetaData((prevItems: any) => {
          const newFieldData = { ...values, isSystem: values.isSystem == true ? true : '' }
          const formtatedFieldPayload = fieldBasedPayloadFormating(newFieldData, currentFields, fieldMetaData);
          const existingIndex = prevItems.findIndex((item: any) => item.identifier === formtatedFieldPayload.identifier);
          let updatedItems;
          if (existingIndex !== -1) {
            updatedItems = [...prevItems];
            updatedItems[existingIndex] = formtatedFieldPayload;
            return updatedItems
          }
          else {
            updatedItems = [...prevItems, formtatedFieldPayload];
            if (params?.id !== 'new' && formtatedFieldPayload?.required && !formtatedFieldPayload?.defaultValue) {
              setIsRequiredPopUp(true);
            }
            // return [...prevItems, formtatedFieldPayload]
          }
          return updatedItems;
        });
        if (values.userKey) {
          const data = {
            modelName: values.relationCoModelSingularName,
            fieldName: values.userKey
          }
          updateUserKey(data);
        }
        // nextTab()
        setVisiblePopup(false);

      } catch (err) {
        console.error(ERROR_MESSAGES.CREATE_MODEL, err);
      }
    },
    validateOnBlur: false // Disable validation on blur



  });

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

  useEffect(() => {
    if (isUpdateUserKeySuccess) {
      showToaster([newModel?.data?.message], "success");
    } if (isUpdateUserKeyError) {
      showToaster(UpdateUserKeyError, 'error')
    }
  }, [isUpdateUserKeySuccess, isUpdateUserKeyError])

  const handleTypeSelect = (e: any, label: string) => {

    setShowTypeFilter(false);
    setSelectedType({ label: label, value: e });
    formik.setFieldValue("type", e);
    if (e == "email") {
      formik.setFieldValue("regexPattern", "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$");
    } else {
      formik.setFieldValue("regexPattern", "");
    }
    const ormType = fieldDefaultMetaData.data.ormType[modelMetaData?.dataSourceType];
    const availableOrmTypes = ormType[e];
    // setFilteredOrmTypes(availableOrmTypes.ormTypes.map((e: any) => ({
    //   label: e,
    //   value: e,
    // })));
    // setSelectedOrmType({ label: availableOrmTypes.ormTypes[0], value: availableOrmTypes.ormTypes[0] });
    setOrmTypeOptions(availableOrmTypes.ormTypes)
    formik.setFieldValue("ormType", availableOrmTypes.ormTypes[0].label);
    setSelectedOrmType(availableOrmTypes.ormTypes[0].label)
    setCurrentFields(
      fetchCurrentFields(e, fieldDefaultMetaData)
    );
    // setTypeSelected(true);
  }


  useEffect((() => {
    setOrmTypeOptions(fieldDefaultMetaData && formik.values.type && fieldDefaultMetaData.data.ormType[modelMetaData?.dataSourceType][formik.values.type].ormTypes);
  }), [formik])


  useEffect(() => {
    if (fieldMetaData && fieldMetaData.columnName) {
      setShowColumnName(true)
    }
  }, [fieldMetaData])

  useEffect(() => {
    const fetchFields = async () => {
      const queryData: any = {
        limit: 100,
        offset: 0,
        filters: {
          singularName: {
            $eq: formik.values.relationCoModelSingularName
          }
        },
        populate: ['fields']
      };
      const queryString = qs.stringify(queryData, {
        encodeValuesOnly: true,
      });
      const result = await triggerGetModels(queryString).unwrap();

      if (result && result.records) {
        if (!result?.records[0]?.userKeyField) {
          setAskForUserKeyField(true);
          const validUserKeyFields = result?.records[0]?.fields?.filter(
            (field: any) => field?.unique === true && field?.type === 'shortText'
          );
          setUserKeyFieldData(validUserKeyFields)
        } else {
          setAskForUserKeyField(false);
          setUserKeyFieldData([]);
        }
      }
    }
    if (formik.values.relationCoModelSingularName) {
      fetchFields();
    }
  }, [formik.values.relationCoModelSingularName])

  const updateEnumValues = (index: number, updatedString: string) => {
    const updatedValues = formik.values.selectionStaticValues.map((enumValue: string, i: number) =>
      i === index ? updatedString : enumValue
    );
    formik.setFieldValue("selectionStaticValues", updatedValues);
  };

  const addEnumValue = () => {
    formik.setFieldValue("selectionStaticValues", [...formik.values.selectionStaticValues, ":"]);
  };

  const deleteEnumValue = (index: number) => {
    if (formik.values.selectionStaticValues.length > 1) {
      const updatedRows = formik.values.selectionStaticValues.filter((_: string, rowIndex: number) => rowIndex !== index);
      formik.setFieldValue("selectionStaticValues", updatedRows);
    } else {

    }
  };

  useEffect(() => {
    if (formik.dirty) {
      setIsDirty(true);
    }
  }, [formik.dirty]);

  const handleChange = (index: number, updatedRow: any) => {
    const updatedRows = [...formik.values.computedFieldTriggerConfig];
    updatedRows[index] = updatedRow;
    formik.setFieldValue("computedFieldTriggerConfig", updatedRows);
  };

  const handleAdd = () => {
    const updatedRows = [
      ...formik.values.computedFieldTriggerConfig,
      { moduleName: '', modelName: '', operations: [] }
    ];
    formik.setFieldValue("computedFieldTriggerConfig", updatedRows);
  };

  const handleDelete = (index: number) => {
    const updatedRows = formik.values.computedFieldTriggerConfig.filter((_: any, i: number) => i !== index);
    formik.setFieldValue("computedFieldTriggerConfig", updatedRows.length > 0 ? updatedRows : [{ moduleName: '', modelName: '', operations: [] }]);
  };

  console.log("formik.values.computedFieldTriggerConfig", formik.values.computedFieldTriggerConfig);

  const computedFieldSearchHandlers = useMemo(() => {
    return formik.values.computedFieldTriggerConfig.map(row =>
      getSearchModelNameHandler(row.moduleName)
    );
  }, [formik.values.computedFieldTriggerConfig]);


  return (
    <div>
      <Toast ref={toast} />
      <div>
        <form onSubmit={formik.handleSubmit}>
          <div className="solid-field-metadata-form-header">
            {pathname.includes('create') ?
              <>
                <div className="flex align-items-center gap-3">
                  {showTypeFilter === false ?
                    <>
                      <Button
                        text
                        icon='pi pi-arrow-left'
                        size="small"
                        type="button"
                        aria-label="Back"
                        className='max-w-2rem bg-primary-reverse text-color solid-icon-button'
                        onClick={() => {
                          if (!formik.values.displayName) {
                            setShowTypeFilter(true)
                          } else {
                            setIsBackPopupVisible(true)
                          }
                        }
                        }
                      />
                      <div className="form-wrapper-title solid-mobile-text-wrapper text-base">{capitalize(modelMetaData?.displayName)}</div>
                    </>
                    :
                    <div className="flex text-2xl font-bold align-items-center ml-4" style={{ color: '#000' }}>
                      <div className="form-wrapper-title solid-mobile-text-wrapper text-base">Model - {capitalize(modelMetaData?.displayName)}</div>
                    </div>
                  }
                </div>
                <div className="flex align-items-center gap-3 close-popup">
                  <Button icon="pi pi-times" rounded text aria-label="Cancel" type="reset" size="small" onClick={() => setVisiblePopup(false)}
                    className='max-w-2rem bg-primary-reverse text-color' />
                </div>
              </>
              :
              <>
                <div className="flex align-items-center gap-3">
                  {!fieldMetaData?.id &&
                    <Button
                      text
                      icon='pi pi-arrow-left'
                      size="small"
                      type="button"
                      aria-label="Back"
                      className='max-w-2rem bg-primary-reverse text-color solid-icon-button'
                      onClick={() => {
                        if (!formik.values.displayName) {
                          setShowTypeFilter(true)
                        } else {
                          setIsBackPopupVisible(true)
                        }
                      }
                      } />
                  }
                  {fieldMetaData ?

                    <div className="form-wrapper-title solid-mobile-text-wrapper text-base">Edit {capitalize(fieldMetaData?.displayName)}</div>
                    :
                    <div className="form-wrapper-title solid-mobile-text-wrapper text-base">Add New {selectedType?.label && !showTypeFilter && capitalize(selectedType.label)} Field to {capitalize(modelMetaData?.displayName)}</div>
                  }
                </div>
                <div className="flex align-items-center gap-3 close-popup">
                  <Button icon="pi pi-times" text aria-label="Cancel" type="reset" size="small" onClick={() => setVisiblePopup(false)}
                    className='max-w-2rem bg-primary-reverse text-color'
                  />
                </div>
              </>
            }
          </div>
          {showTypeFilter === true ?
            <FieldSelector
              handleTypeSelect={handleTypeSelect}
              modelMetaData={modelMetaData}
            ></FieldSelector>
            :
            <div className="p-4" style={{ maxHeight: '80vh', overflowY: 'auto', overflowX: 'hidden' }}>
              <div className="p-d-flex p-jc-center creat-field-for form-dem">
                <div className="p-fluid" style={{ position: 'relative' }}>
                  {/* <div className="mb-3">
                    <div className="form-wrapper-title">{fieldMetaData ? `Edit ${capitalize(selectedType.label)} Field` : `Add a new ${capitalize(selectedType.label)} Field`}</div>
                  </div> */}
                  <TabView panelContainerClassName="px-0">
                    <TabPanel
                      header="Basic Info"
                      className={(formik.touched.hasOwnProperty("name") && formik.errors.hasOwnProperty("name")) || (formik.touched.hasOwnProperty("displayName") && formik.errors.hasOwnProperty("displayName")) || (formik.touched.hasOwnProperty("displayName") && formik.errors.hasOwnProperty("ormType")) ? "tab-error-heading" : ""}
                    // rightIcon="pi pi-info-circle ml-2"
                    >
                      <div className="formgrid grid">
                        {currentFields.includes("displayName") && (
                          <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-2">
                            <label htmlFor="displayName" className="form-field-label">
                              Display Name
                            </label>
                            <InputText
                              type="text"
                              disabled={fieldMetaData?.id}
                              id="displayName"
                              name="displayName"
                              onChange={(e) => {
                                formik.setFieldValue("displayName", e.target.value);
                                const { toCamelCase, toSnakeCase, toPluralCamelCase } = getSingularAndPlural(e.target.value);
                                formik.setFieldValue("name", toCamelCase);
                                if (showColumnName) {
                                  formik.setFieldValue("columnName", toSnakeCase);
                                }

                              }}
                              value={formik.values.displayName}
                              className={classNames("", {
                                "p-invalid": isFormFieldValid(
                                  formik,
                                  "displayName"
                                ),
                              })}
                            />
                            {isFormFieldValid(formik, "displayName") && (
                              <Message
                                severity="error"
                                text={formik?.errors?.displayName?.toString()}
                              />
                            )}
                          </div>
                        )}


                        {currentFields.includes("name") && (
                          <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3 md:mt-0">
                            <label htmlFor="name" className="form-field-label">
                              Name
                            </label>
                            <InputText
                              disabled={fieldMetaData?.id}
                              type="text"
                              id="name"
                              name="name"
                              onChange={formik.handleChange}
                              value={formik.values.name}
                              className={classNames("", {
                                "p-invalid": isFormFieldValid(formik, "name"),
                              })}
                            />
                            {isFormFieldValid(formik, "name") && (
                              <Message
                                severity="error"
                                text={formik?.errors?.name?.toString()}
                              />
                            )}
                          </div>
                        )}
                        {currentFields.includes("description") && (
                          <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3 md:mt-4">
                            <label htmlFor="description" className="form-field-label">
                              Description
                            </label>
                            <InputTextarea
                              aria-describedby="Description of your field"
                              id="description"
                              name="description"
                              onChange={formik.handleChange}
                              value={formik.values.description}
                              rows={5}
                              cols={30}
                              className={classNames("", {
                                "p-invalid": isFormFieldValid(
                                  formik,
                                  "description"
                                ),
                              })}
                            />
                            {isFormFieldValid(formik, "description") && (
                              <Message
                                severity="error"
                                text={formik?.errors?.description?.toString()}
                              />
                            )}
                          </div>
                        )}

                        {currentFields.includes("columnName") && (
                          <div className="field col-12 md:col-6 mt-4">
                            <div className="flex align-items-center gap-2">
                              <Checkbox onChange={e => {
                                setShowColumnName(e.checked);
                                if (e.checked === true) {
                                  const { toCamelCase, toSnakeCase, toPluralCamelCase } = getSingularAndPlural(formik.values.displayName);
                                  if (pathname.includes('create')) {
                                    formik.setFieldValue("columnName", toSnakeCase);
                                  }
                                } else {
                                  formik.setFieldValue("columnName", null);
                                }

                              }} checked={showColumnName} disabled={fieldMetaData?.id}></Checkbox>
                              <label htmlFor="ingredient1" className="form-field-label">
                                Set Column Name
                              </label>
                            </div>
                            {showColumnName &&
                              <div className="field col-12 flex-flex-column gap-2 mt-4">
                                <label htmlFor="columnName" className="form-field-label">
                                  Column Name
                                </label>
                                <InputText
                                  disabled={fieldMetaData?.id}
                                  type="text"
                                  id="columnName"
                                  name="columnName"
                                  onChange={formik.handleChange}
                                  value={formik.values.columnName}
                                  className={classNames("", {
                                    "p-invalid": isFormFieldValid(formik, "columnName"),
                                  })}
                                />
                                {isFormFieldValid(formik, "columnName") && (
                                  <Message
                                    severity="error"
                                    text={formik?.errors?.columnName?.toString()}
                                  />
                                )}
                              </div>
                            }
                          </div>
                        )}


                        {/* {currentFields.includes("type") && (
                          <div className="md:col-6 sm:col-12">
                            <div className="field col-6 flex-flex-column gap-2">
                              <label htmlFor="type" className="form-field-label">
                                Type
                              </label>
                              <AutoComplete
                                value={selectedType}
                                suggestions={filteredTypes}
                                invalid={isFormFieldValid(formik, "type")}
                                completeMethod={searchTypes}
                                virtualScrollerOptions={{ itemSize: 38 }}
                                field="label"
                                className="small-input"
                                dropdown
                                onChange={(e) => {
                                  formik.setFieldTouched('type', true); // Manually mark as touched
                                  setSelectedType(e.value);
                                  formik.setFieldValue("type", e.value.value);
                                  if (e.value.value == "email") {
                                    formik.setFieldValue("regexPattern", "/^[a-zA-Z0-9. _%+-]+@[a-zA-Z0-9. -]+\\. [a-zA-Z]{2,}$/");
                                  } else {
                                    formik.setFieldValue("regexPattern", "");
                                  }
                                  const _filteredOrmType: any = fieldDefaultMetaData.data.ormType.filter((t: any) => t.solidType == e.value.value);
                                  setSelectedOrmType(_filteredOrmType[0].value)
                                  formik.setFieldValue("ormType", _filteredOrmType[0].value);

                                  setCurrentFields(
                                    fetchCurrentFields(e.value.value, fieldDefaultMetaData)
                                  );
                                }}


                              />

                              {isFormFieldValid(formik, "type") && (
                                <Message
                                  severity="error"
                                  text={formik?.errors?.type?.toString()}
                                />
                              )}
                            </div>
                          </div>
                        )} */}

                      </div>

                    </TabPanel>

                    <TabPanel header="Advanced Config"

                    //  rightIcon="pi pi-cog ml-2"
                    >
                      {formik?.values?.type?.length > 0 && (
                        <div className="formgrid grid">
                          {currentFields.includes("length") && (
                            <div className="field col-6 flex-flex-column gap-2">
                              <label htmlFor="length" className="form-field-label">
                                Length
                              </label>
                              <InputNumber
                                // type="text"
                                id="length"
                                name="length"
                                onValueChange={formik.handleChange}
                                value={formik.values.length}
                                className={classNames("", {
                                  "p-invalid": isFormFieldValid(
                                    formik,
                                    "length"
                                  ),
                                })}
                              />
                              {isFormFieldValid(formik, "length") && (
                                <Message
                                  severity="error"
                                  text={formik?.errors?.length?.toString()}
                                />
                              )}
                            </div>
                          )}
                          {currentFields.includes("defaultValue") && (
                            <div className="field col-12  md:col-6 flex-flex-column gap-2 mt-3">
                              <label
                                htmlFor="defaultValue"
                                className="form-field-label"
                              >
                                Default Value
                              </label>
                              {/* <InputText
                                type="text"
                                id="defaultValue"
                                name="defaultValue"
                                onChange={formik.handleChange}
                                value={formik.values.defaultValue}
                                className={classNames("", {
                                  "p-invalid": isFormFieldValid(
                                    formik,
                                    "defaultValue"
                                  ),
                                })}
                              /> */}
                              {(selectedType.value === "shortText" || selectedType.value === "longText" || selectedType.value === "richText" || selectedType.value === "json" || selectedType.value === "password" || selectedType.value === "selectionStatic") &&
                                <InputText
                                  type="text"
                                  id="defaultValue"
                                  name="defaultValue"
                                  onChange={formik.handleChange}
                                  value={formik.values.defaultValue}
                                  className={classNames("", {
                                    "p-invalid": isFormFieldValid(
                                      formik,
                                      "defaultValue"
                                    ),
                                  })}
                                />
                              }
                              {(selectedType.value === "float" || selectedType.value === "decimal") &&
                                <InputNumber
                                  id="defaultValue"
                                  name="defaultValue"
                                  minFractionDigits={2}
                                  maxFractionDigits={5}
                                  value={formik.values.defaultValue}
                                  onValueChange={(e) => formik.setFieldValue("defaultValue", e.value)}  // Ensure correct value change handling
                                  className={classNames("", {
                                    "p-invalid": isFormFieldValid(formik, "defaultValue"),
                                  })}
                                />
                              }
                              {(selectedType.value === "int" || selectedType.value === "bigint") &&
                                <InputNumber
                                  id="defaultValue"
                                  name="defaultValue"
                                  value={formik.values.defaultValue}
                                  onValueChange={(e) => formik.setFieldValue("defaultValue", e.value)}  // Ensure correct value change handling
                                  className={classNames("", {
                                    "p-invalid": isFormFieldValid(formik, "defaultValue"),
                                  })}
                                />
                              }
                              {selectedType.value === "boolean" &&
                                <SelectButton
                                  value={formik.values.defaultValue ? formik.values.defaultValue : "false"}
                                  onChange={(e) => formik.setFieldValue("defaultValue", e.value)} // Custom handling for boolean input
                                  options={booleanOptions}
                                  className={classNames("", {
                                    "p-invalid": isFormFieldValid(formik, "defaultValue"),
                                  })}
                                />
                              }
                              {(selectedType.value === "date" || selectedType.value === "datetime" || selectedType.value === "time") &&
                                <Calendar
                                  id="defaultValue"
                                  name="defaultValue"
                                  value={formik.values.defaultValue ? new Date(formik.values.defaultValue) : null}
                                  onChange={(e) => formik.setFieldValue("defaultValue", e.value)} // Use setFieldValue for proper handling
                                  showTime={formik.values.type === "datetime"}  // Show time picker for datetime
                                  timeOnly={formik.values.type === "time"}      // Time-only for time
                                  dateFormat="yy-mm-dd"
                                  hourFormat="24"                             // 24-hour format for time
                                  className={classNames("", {
                                    "p-invalid": isFormFieldValid(formik, "defaultValue"),
                                  })}
                                />
                              }
                              {isFormFieldValid(formik, "defaultValue") && (
                                <Message
                                  severity="error"
                                  text={formik?.errors?.defaultValue?.toString()}
                                />
                              )}
                            </div>
                          )}

                          {currentFields.includes("mediaTypes") && (
                            <div className="field col-12 md:col-6 flex-flex-column gap-2">
                              <label
                                htmlFor="mediaTypes"
                                className="form-field-label"
                              >
                                Media Type
                              </label>
                              {/* <MultipleSelectAutoCompleteField
                                  key="mediaTypes"
                                  formik={formik}
                                  isFormFieldValid={isFormFieldValid}
                                  fieldName="mediaTypes"
                                  fieldNameId="mediaTypes"
                                  labelKey="label"
                                  valueKey="value"
                                  searchData={searchMediaTypes}
                                  existingData={formik.values.mediaTypes}
                                /> */}

                              {/* {selectedType.value === "mediaSingle" &&
                                  <SingleSelectAutoCompleteField
                                    key="mediaTypes"
                                    formik={formik}
                                    isFormFieldValid={isFormFieldValid}
                                    fieldName="mediaTypes"
                                    fieldNameId="mediaTypes"
                                    labelKey="label"
                                    valueKey="value"
                                    searchData={searchMediaTypes}
                                    existingData={formik.values.mediaTypes}
                                  />
                                } */}

                              {isFormFieldValid(formik, "mediaTypes") && (
                                <Message
                                  severity="error"
                                  text={formik?.errors?.mediaTypes?.toString()}
                                />
                              )}
                              <MultiSelect value={formik.values.mediaTypes} onChange={(e) => formik.setFieldValue("mediaTypes", e.value)} options={mediaTypesOptions} optionLabel="label"
                                placeholder="Select Media Types" maxSelectedLabels={3} display="chip" className="" />


                              {/* <Dropdown
                                  id="mediaTypes"
                                  name="mediaTypes"
                                  multiple
                                  value={formik.values.mediaTypes}
                                  options={fieldDefaultMetaData.data.mediaTypes}
                                  onChange={(e) =>
                                    formik.setFieldValue("mediaTypes", e.value)
                                  }
                                  placeholder="Select a Media Type"
                                  className={classNames("", {
                                    "p-invalid": isFormFieldValid(
                                      formik,
                                      "mediaTypes"
                                    ),
                                  })}
                                /> */}


                            </div>
                          )}
                          {currentFields.includes("mediaMaxSizeKb") && (
                            <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3 md:mt-0">
                              <label
                                htmlFor="mediaMaxSizeKb"
                                className="form-field-label"
                              >
                                Media Max Size (Mb)
                              </label>
                              <InputNumber
                                id="mediaMaxSizeKb"
                                name="mediaMaxSizeKb"
                                onValueChange={formik.handleChange}
                                value={formik.values.mediaMaxSizeKb}
                                className={classNames("", {
                                  "p-invalid": isFormFieldValid(
                                    formik,
                                    "mediaMaxSizeKb"
                                  ),
                                })}
                              />

                              {isFormFieldValid(formik, "mediaMaxSizeKb") && (
                                <Message
                                  severity="error"
                                  text={formik?.errors?.mediaMaxSizeKb?.toString()}
                                />
                              )}
                            </div>
                          )}
                          {currentFields.includes("mediaStorageProviderId") && (
                            <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3">
                              <label
                                htmlFor="mediaStorageProviderId"
                                className="form-field-label"
                              >
                                Media  Storage Provider
                              </label>

                              <SingleSelectAutoCompleteField
                                key="mediaStorageProviderId"
                                formik={formik}
                                isFormFieldValid={isFormFieldValid}
                                relationField={true}
                                fieldName="mediaStorageProvider"
                                fieldNameId="mediaStorageProviderId"
                                labelKey="name"
                                valueKey="value"
                                searchData={searchMediaStorageProvIderId}
                                existingData={formik.values.mediaStorageProvider}
                              />

                              {isFormFieldValid(
                                formik,
                                "mediaStorageProvider"
                              ) && (
                                  <Message
                                    severity="error"
                                    text={formik?.errors?.mediaStorageProviderId?.toString()}
                                  />
                                )}
                            </div>
                          )}

                          {currentFields.includes("mediaEmbedded") && (
                            <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3">
                              <label
                                htmlFor="mediaEmbedded"
                                className="form-field-label"
                              >
                                Media Embedded
                              </label>
                              {/* <InputText
                                type="text"
                                id="mediaEmbedded"
                                name="mediaEmbedded"
                                onChange={formik.handleChange}
                                value={formik.values.mediaEmbedded}
                                className={classNames("", {
                                  "p-invalid": isFormFieldValid(
                                    formik,
                                    "mediaEmbedded"
                                  ),
                                })}
                              /> */}
                              <SelectButton
                                value={formik.values.mediaEmbedded}
                                // onChange={formik.handleChange}
                                onChange={(e) => {
                                  formik.setFieldValue("mediaEmbedded", e.value);
                                }}
                                options={booleanOptions}
                                className={classNames("", {
                                  "p-invalid": isFormFieldValid(
                                    formik,
                                    "mediaEmbedded"
                                  ),
                                })}
                              />
                              {isFormFieldValid(formik, "mediaEmbedded") && (
                                <Message
                                  severity="error"
                                  text={formik?.errors?.mediaEmbedded?.toString()}
                                />
                              )}
                            </div>
                          )}
                          {currentFields.includes("relationType") && (
                            <div className="field col-12 flex-flex-column gap-2 mt-3">
                              {/* <label
                                  htmlFor="relationType"
                                  className="form-field-label"
                                >
                                  Relation Type
                                </label>
                                <Dropdown
                                  id="relationType"
                                  name="relationType"
                                  value={formik.values.relationType}
                                  options={fieldDefaultMetaData.data.relationTypes}
                                  onChange={(e) =>
                                    formik.setFieldValue("relationType", e.value)
                                  }
                                  placeholder="Select a Data Source"
                                  className={classNames("", {
                                    "p-invalid": isFormFieldValid(
                                      formik,
                                      "relationType"
                                    ),
                                  })}
                                /> */}

                              <label
                                htmlFor="relationType"
                                className="form-field-label "
                              >
                                Relation Type
                              </label>
                              <SelectButton
                                value={formik.values.relationType}
                                options={fieldDefaultMetaData.data.relationTypes}
                                onChange={(e) => {
                                  formik.setFieldValue("relationType", e.value);
                                  if (e.value === "one-to-many") {
                                    formik.setFieldValue("relationCreateInverse", true);
                                  }
                                }
                                }
                                className={classNames("", {
                                  "p-invalid": isFormFieldValid(formik, "relationType"),
                                })}
                                optionLabel="label"
                              />

                              {/* <div className="align-items-center">
                                  <div className="flex mt-3">
                                    {fieldDefaultMetaData?.data?.relationTypes.map((i: any) => (
                                      <div key={i.value} className="mr-3">
                                        <RadioButton
                                          inputId="ingredient1"
                                          name="pizza"
                                          value={i.value}
                                          onChange={(e) => formik.setFieldValue("relationType", e.value)}
                                          checked={formik.values.relationType === i.value}
                                        />
                                        <label htmlFor="ingredient1" className="form-field-label ml-2">{i.value}</label>
                                      </div>
                                    ))}
                                  </div>
                                </div> */}

                              {isFormFieldValid(formik, "relationType") && (
                                <Message
                                  severity="error"
                                  text={formik?.errors?.relationType?.toString()}
                                />
                              )}
                            </div>
                          )}
                          {currentFields.includes("relationType") && (formik.values.relationType === "many-to-one" || formik.values.relationType === "one-to-many") && (
                            <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3">
                              <label
                                htmlFor="relationCascade"
                                className="form-field-label"
                              >
                                Relation Cascade
                              </label>
                              <Dropdown
                                id="relationCascade"
                                name="relationCascade"
                                value={formik.values.relationCascade}
                                options={fieldDefaultMetaData.data.cascadeTypes}
                                onChange={(e) =>
                                  formik.setFieldValue(
                                    "relationCascade",
                                    e.value
                                  )
                                }
                                placeholder="Cascade"
                                className={classNames("w-full", {
                                  "p-invalid": isFormFieldValid(
                                    formik,
                                    "relationCascade"
                                  ),
                                })}
                              />
                              {isFormFieldValid(formik, "relationCascade") && (
                                <Message
                                  severity="error"
                                  text={formik?.errors?.relationCascade?.toString()}
                                />
                              )}
                            </div>
                          )}

                          {currentFields.includes("relationModelModuleName") && (
                            <div className="field col-12 md:col-6 flex-flex-column gap-2  mt-3">
                              <label
                                htmlFor="relationModelModuleName"
                                className="form-field-label"
                              >
                                Co-Module Name
                              </label>

                              <SingleSelectAutoCompleteField
                                key="relationModelModuleName"
                                formik={formik}
                                isFormFieldValid={isFormFieldValid}
                                fieldName="relationModelModuleName"
                                fieldNameId="relationModelModuleName"
                                labelKey="name"
                                valueKey="name"
                                searchData={searchRelationModelModuleNames}
                                existingData={formik.values.relationModelModuleName}
                                additionalAction={(e: any) => {
                                  formik.setFieldValue("relationCoModelSingularName", "");
                                  formik.setFieldValue("relationCoModelColumnName", "");
                                  formik.setFieldValue("relationJoinTableName", "");
                                }}
                              />

                              {/* <AutoComplete
                                  value={selectedRelationModelModuleName}
                                  suggestions={filteredRelationModelModuleNames}
                                  invalid={isFormFieldValid(
                                    formik,
                                    "relationModelModuleName"
                                  )}
                                  completeMethod={searchRelationModelModuleNames}
                                  virtualScrollerOptions={{ itemSize: 38 }}
                                  field="label"
                                  className="small-input"
                                  dropdown
                                  onChange={(e) => {
                                    setSelectedRelationModelModuleName(e.value);
                                    formik.setFieldValue(
                                      "relationModelModuleName",
                                      e.value
                                    );
                                  }}
                                /> */}

                              {isFormFieldValid(
                                formik,
                                "relationModelModuleName"
                              ) && (
                                  <Message
                                    severity="error"
                                    text={formik?.errors?.relationModelModuleName?.toString()}
                                  />
                                )}
                            </div>
                          )}

                          {currentFields.includes(
                            "relationCoModelSingularName"
                          ) && (
                              <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3">
                                <label
                                  htmlFor="relationCoModelSingularName"
                                  className="form-field-label"
                                >
                                  Co-Model Name
                                </label>


                                <SingleSelectAutoCompleteField
                                  key="relationCoModelSingularName"
                                  formik={formik}
                                  isFormFieldValid={isFormFieldValid}
                                  fieldName="relationCoModelSingularName"
                                  fieldNameId="relationCoModelSingularName"
                                  labelKey="displayName"
                                  valueKey="singularName"
                                  searchData={searchrelationCoModelSingularNames}
                                  existingData={formik.values.relationCoModelSingularName}
                                />

                                {isFormFieldValid(
                                  formik,
                                  "relationCoModelSingularName"
                                ) && (
                                    <Message
                                      severity="error"
                                      text={formik?.errors?.relationCoModelSingularName?.toString()}
                                    />
                                  )}
                                {formik.values.relationType === "one-to-many" &&
                                  <p className="fieldSubTitle">This is the child model.</p>
                                }
                                {formik.values.relationType === "many-to-one" &&
                                  <p className="fieldSubTitle">This is the parent model.</p>
                                }
                              </div>
                            )}
                          {currentFields.includes("relationCoModelColumnName") && (formik.values.relationType === "many-to-many" || formik.values.relationType === "many-to-one") && (
                            <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3">
                              <label
                                htmlFor="relationCoModelColumnName"
                                className="form-field-label"
                              >
                                Relation Co-Model Column Name
                              </label>
                              <InputText
                                type="text"
                                id="relationCoModelColumnName"
                                name="relationCoModelColumnName"
                                onChange={formik.handleChange}
                                disabled={fieldMetaData?.id}
                                value={formik.values.relationCoModelColumnName}
                                className={classNames("", {
                                  "p-invalid": isFormFieldValid(
                                    formik,
                                    "relationCoModelColumnName"
                                  ),
                                })}
                              />
                              {isFormFieldValid(formik, "relationCoModelColumnName") && (
                                <Message
                                  severity="error"
                                  text={formik?.errors?.relationCoModelColumnName?.toString()}
                                />
                              )}
                              <p className="fieldSubTitle">Allows you to control the column name of the foreign key. Eg. when adding a country field to state model, by default foreign key column in the state table will be called country_id, use this field to create a foreign key with a different name. </p>

                            </div>
                          )}
                          {askForUserKeyField && (
                            <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3">
                              <label
                                htmlFor="userKey"
                                className="form-field-label"
                              >
                                Set User Key
                              </label>

                              <SingleSelectAutoCompleteField
                                key="userKey"
                                formik={formik}
                                isFormFieldValid={isFormFieldValid}
                                fieldName="userKey"
                                fieldNameId="userKey"
                                labelKey="displayName"
                                valueKey="name"
                                searchData={searchUserKeyField}
                                existingData={formik.values.userKey}
                              />
                              <p className="fieldSubTitle">The co-model you have selected does not have a user key specified. Use the above dropdown to choose from one of the "unique" fields in this co-model to be set as its userkey. User keys are required in co-models being used in many-to-one or one-to-many relations as in SolidX when a many-to-one field is rendered it uses an autocomplete dropdown, and the user key value is what is displayed as the label in the dropdown.</p>
                              {isFormFieldValid(
                                formik,
                                "userKey"
                              ) && (
                                  <Message
                                    severity="error"
                                    text={formik?.errors?.userKey?.toString()}
                                  />
                                )}
                            </div>
                          )}

                          {currentFields.includes(
                            "relationFieldFixedFilter"
                          ) && (
                              <div className="field col-12 flex-flex-column gap-2 mt-3">
                                <label
                                  htmlFor="relationFieldFixedFilter"
                                  className="form-field-label"
                                >
                                  Relation Field Fixed Filter
                                </label>

                                <InputTextarea
                                  aria-describedby="Fixed Filter"
                                  id="relationFieldFixedFilter"
                                  name="relationFieldFixedFilter"
                                  onChange={formik.handleChange}
                                  value={formik.values.relationFieldFixedFilter}
                                  rows={5}
                                  cols={30}
                                  className={classNames("", {
                                    "p-invalid": isFormFieldValid(
                                      formik,
                                      "relationFieldFixedFilter"
                                    ),
                                  })}
                                />
                                {/* 
                                <InputText
                                  type="text"
                                  id="relationFieldFixedFilter"
                                  name="relationFieldFixedFilter"
                                  onChange={formik.handleChange}
                                  disabled={fieldMetaData?.id}
                                  value={formik.values.relationFieldFixedFilter}
                                  className={classNames("", {
                                    "p-invalid": isFormFieldValid(
                                      formik,
                                      "relationFieldFixedFilter"
                                    ),
                                  })}
                                /> */}
                                {isFormFieldValid(formik, "relationFieldFixedFilter") && (
                                  <Message
                                    severity="error"
                                    text={formik?.errors?.relationFieldFixedFilter?.toString()}
                                  />
                                )}
                                <p className="fieldSubTitle">Many to one fields are rendered as autocomplete dropdown on the SolidX ui. Use the fixed filter to load a pre-filtered set of records from the co-model. Please note user input entered in the autocomplete is used to apply a dynamic filter.</p>

                              </div>
                            )}

                          {currentFields.includes("relationCreateInverse") && (
                            <div className="field col-12 md:col-6 flex flex-column gap-2 mt-3">
                              <label htmlFor="relationCreateInverse" className="form-field-label">
                                Relation Create Inverse
                              </label>
                              <div className="flex align-items-center">
                                <Checkbox
                                  inputId="relationCreateInverse"
                                  name="relationCreateInverse"
                                  checked={formik.values.relationCreateInverse}
                                  disabled={formik.values.relationType === "one-to-many" ? true : false}
                                  onChange={(e) => formik.setFieldValue("relationCreateInverse", e.checked)}
                                />
                                <label htmlFor="relationCreateInverse" className="ml-2">Create Inverse</label>
                              </div>
                              {isFormFieldValid(formik, "relationCreateInverse") && (
                                <Message severity="error" text={formik?.errors?.relationCreateInverse?.toString()} />
                              )}
                            </div>
                          )}

                          {currentFields.includes("relationCoModelFieldName") && formik.values.relationCreateInverse && !formik.values.relationCoModelSingularName && (
                            <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3">
                              <Message text="Please select Co-model" />
                            </div>
                          )}
                          {currentFields.includes("relationCoModelFieldName") && formik.values.relationCreateInverse && formik.values.relationCoModelSingularName && (
                            <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3">
                              <label
                                htmlFor="relationCoModelFieldName"
                                className="form-field-label"
                              >
                                Field Name In {formik.values.relationCoModelSingularName} Model
                              </label>
                              <InputText
                                type="text"
                                id="relationCoModelFieldName"
                                name="relationCoModelFieldName"
                                onChange={formik.handleChange}
                                disabled={fieldMetaData?.id}
                                value={formik.values.relationCoModelFieldName}
                                className={classNames("", {
                                  "p-invalid": isFormFieldValid(
                                    formik,
                                    "relationCoModelFieldName"
                                  ),
                                })}
                              />
                              {formik.values.relationType === "one-to-many" &&
                                <p className="fieldSubTitle">This is a field that is created in the child model. In this case a <span style={{ fontWeight: "700" }}>{formik.values.relationCoModelFieldName ?? formik.values.relationCoModelSingularName}</span> field will be created in the {formik.values.relationCoModelSingularName} when setting create inverse true.</p>
                              }
                              {formik.values.relationType === "many-to-one" &&
                                <p className="fieldSubTitle">This is a field that is created in the parent model. In this case a <span style={{ fontWeight: "700" }}>{formik.values.relationCoModelFieldName ?? `${formik.values.relationCoModelSingularName}s`}</span> field will be created in the {formik.values.relationCoModelSingularName} when setting create inverse true.</p>
                              }
                              {formik.values.relationType === "many-to-many" &&
                                <p className="fieldSubTitle">In this case a {formik.values.relationCoModelFieldName} field will be created in the <span style={{ fontWeight: "700" }}>{formik.values.relationCoModelSingularName ?? '{{}}'}</span> when setting create inverse true.</p>
                              }
                              {isFormFieldValid(formik, "relationCoModelFieldName") && (
                                <Message
                                  severity="error"
                                  text={formik?.errors?.relationCoModelFieldName?.toString()}
                                />
                              )}
                            </div>
                          )}

                          {/* {currentFields.includes("joinColumnName") && formik.values.relationType === "many-to-many" && (
                            <div className="field col-6 flex-flex-column gap-2 mt-3">
                              <label
                                htmlFor="joinColumnName"
                                className="form-field-label"
                              >
                                Join Column Name
                              </label>
                              <InputText
                                type="text"
                                id="joinColumnName"
                                name="joinColumnName"
                                onChange={formik.handleChange}
                                value={formik.values.joinColumnName}
                                className={classNames("", {
                                  "p-invalid": isFormFieldValid(
                                    formik,
                                    "joinColumnName"
                                  ),
                                })}
                              />
                              {isFormFieldValid(formik, "joinColumnName") && (
                                <Message
                                  severity="error"
                                  text={formik?.errors?.joinColumnName?.toString()}
                                />
                              )}

                            </div>
                          )} */}



                          {currentFields.includes("relationJoinTableName") && formik.values.relationType === "many-to-many" && (
                            <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3">
                              <label
                                htmlFor="relationJoinTableName"
                                className="form-field-label"
                              >
                                Relation Join Table Name
                              </label>
                              <InputText
                                type="text"
                                id="relationJoinTableName"
                                name="relationJoinTableName"
                                onChange={formik.handleChange}
                                disabled={fieldMetaData?.id}
                                value={formik.values.relationJoinTableName}
                                className={classNames("", {
                                  "p-invalid": isFormFieldValid(
                                    formik,
                                    "relationJoinTableName"
                                  ),
                                })}
                              />
                              {isFormFieldValid(formik, "relationJoinTableName") && (
                                <Message
                                  severity="error"
                                  text={formik?.errors?.relationJoinTableName?.toString()}
                                />
                              )}

                            </div>
                          )}

                          {currentFields.includes("selectionDynamicProvider") && (
                            <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3">
                              <label
                                htmlFor="selectionDynamicProvider"
                                className="form-field-label"
                              >
                                Selection Dynamic Provider
                              </label>

                              <SingleSelectAutoCompleteField
                                key="selectionDynamicProvider"
                                formik={formik}
                                isFormFieldValid={isFormFieldValid}
                                // relationField={false}
                                fieldName="selectionDynamicProvider"
                                fieldNameId={null}
                                labelKey="label"
                                valueKey="value"
                                searchData={searchSelectionDynamicProvider}
                                existingData={formik.values.selectionDynamicProvider}
                                additionalAction={(e: any) => setMarkdownText(e.target.value.help)}
                              />


                              {/* <AutoComplete
                                  value={selectionDynamicProvider}
                                  suggestions={filteredSelectionDynamicProvider}
                                  invalid={isFormFieldValid(
                                    formik,
                                    "selectionDynamicProvider"
                                  )}
                                  completeMethod={searchSelectionDynamicProvider}
                                  virtualScrollerOptions={{ itemSize: 38 }}
                                  field="label"
                                  className="small-input"
                                  dropdown
                                  onChange={(e) => {
                                    setSelectionDynamicProvider(e.value);
                                    formik.setFieldValue(
                                      "selectionDynamicProvider",
                                      e.value.value
                                    );
                                  }}
                                /> */}

                              {isFormFieldValid(
                                formik,
                                "selectionDynamicProvider"
                              ) && (
                                  <Message
                                    severity="error"
                                    text={formik?.errors?.selectionDynamicProvider?.toString()}
                                  />
                                )}
                            </div>
                          )}
                          {currentFields.includes("selectionValueType") && (
                            <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3">
                              <label
                                htmlFor="selectionValueType"
                                className="form-field-label"
                              >
                                Select Value Type
                              </label>
                              <Dropdown
                                id="selectionValueType"
                                name="selectionValueType"
                                value={formik.values.selectionValueType}
                                options={selctionValueTypes}
                                onChange={(e) =>
                                  formik.setFieldValue(
                                    "selectionValueType",
                                    e.value
                                  )
                                }
                                placeholder="Select Value Type"
                                className={classNames("", {
                                  "p-invalid": isFormFieldValid(
                                    formik,
                                    "selectionValueType"
                                  ),
                                })}
                              />
                              {isFormFieldValid(
                                formik,
                                "selectionValueType"
                              ) && (
                                  <Message
                                    severity="error"
                                    text={formik?.errors?.selectionValueType?.toString()}
                                  />
                                )}
                            </div>
                          )}

                          {currentFields.includes("selectionStaticValues") && (
                            <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3">
                              <label
                                htmlFor="selectionStaticValues"
                                className="form-field-label"
                              >
                                Selection Static Values
                              </label>
                              {/* <InputTextarea
                                  value={selectionStaticValues}
                                  placeholder="male:Male"
                                  onChange={(e) => {
                                    const data = e.target.value
                                      .split("\n")
                                      .filter((line) => line.trim() !== "");

                                    setSelectionStaticValues(e.target.value);
                                    formik.setFieldValue(
                                      "selectionStaticValues",
                                      data
                                    );
                                  }}
                                  rows={5}
                                  cols={30}
                                /> */}
                              {formik.values.selectionStaticValues.map((enumValue: string, index: number) => (
                                <SelectionStaticValues
                                  key={index}
                                  enumValue={enumValue}
                                  onUpdate={(updatedString: any) => updateEnumValues(index, updatedString)}
                                  onDelete={() => deleteEnumValue(index)}
                                  onAdd={addEnumValue}
                                />
                              ))
                              }
                              {isFormFieldValid(
                                formik,
                                "selectionStaticValues"
                              ) && (
                                  <Message
                                    severity="error"
                                    text={formik?.errors?.selectionStaticValues?.toString()}
                                  />
                                )}
                            </div>
                          )}

                          {currentFields.includes("computedFieldValueType") && (
                            <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3">
                              <label
                                htmlFor="computedFieldValueType"
                                className="form-field-label"
                              >
                                Computed Field Value Type
                              </label>
                              <AutoComplete

                                value={selectedComputedFieldValueType}
                                invalid={isFormFieldValid(formik, "computedFieldValueType")}
                                suggestions={filteredComputedFieldValueTypes}
                                completeMethod={searchComputedFieldValueType}
                                // virtualScrollerOptions={{ itemSize: 38 }}
                                virtualScrollerOptions={getVirtualScrollerOptions({
                                  itemsLength: filteredComputedFieldValueTypes.length,
                                })}
                                field="label"
                                dropdown
                                className="solid-standard-autocomplete"
                                onChange={(e) => {
                                  setSelectedComputedFieldValueType(e.value);
                                  formik.setFieldValue("computedFieldValueType", e.value.value);
                                }}
                              />

                              {/* <Dropdown
                                id="mediaTypes"
                                name="mediaTypes"
                                value={formik.values.mediaTypes}
                                options={fieldDefaultMetaData.data.mediaTypes}
                                onChange={(e) =>
                                  formik.setFieldValue("mediaTypes", e.value)
                                }
                                placeholder="Select a Data Source"
                                className={classNames("", {
                                  "p-invalid": isFormFieldValid(
                                    formik,
                                    "mediaTypes"
                                  ),
                                })}
                              /> */}
                              {isFormFieldValid(formik, "computedFieldValueType") && (
                                <Message
                                  severity="error"
                                  text={formik?.errors?.computedFieldValueType?.toString()}
                                />
                              )}
                            </div>
                          )}

                          {currentFields.includes(
                            "computedFieldValueProvider"
                          ) && (
                              <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3">
                                <label
                                  htmlFor="computedFieldValueProvider"
                                  className="form-field-label"
                                >
                                  Computed Field Provider
                                </label>
                                <SingleSelectAutoCompleteField
                                  key="computedFieldValueProvider"
                                  formik={formik}
                                  isFormFieldValid={isFormFieldValid}
                                  // relationField={false}
                                  fieldName="computedFieldValueProvider"
                                  fieldNameId={null}
                                  labelKey="label"
                                  valueKey="value"
                                  searchData={searchComputedProvider}
                                  existingData={formik.values.computedFieldValueProvider}
                                  additionalAction={(e: any) => setMarkdownText(e.target.value.help)}

                                />
                                {isFormFieldValid(
                                  formik,
                                  "computedFieldValueProvider"
                                ) && (
                                    <Message
                                      severity="error"
                                      text={formik?.errors?.computedFieldValueProvider?.toString()}
                                    />
                                  )}
                              </div>
                            )}
                          {currentFields.includes(
                            "computedFieldTriggerConfig"
                          ) && (
                              <div className="field col-12 flex-flex-column gap-2 mt-3">
                                {fieldMetaData?.computedFieldTriggerConfig === null
                                  &&
                                  <div className="mb-3">
                                    <Message severity="error" text={`You seem to be using an old configuration of ComputedFieldProvider. Please change your current computed field provider i.e ${fieldMetaData?.computedFieldValueProvider} to implement IEntityComputedFieldProvider before continuing.`} />
                                  </div>
                                }
                                <div className="flex align-items-center gap-2">
                                  <label
                                    htmlFor="computedFieldTriggerConfig"
                                    className="form-field-label"
                                  >
                                    Computed Field Trigger Config
                                  </label>
                                  <div>
                                    <Button
                                      icon="pi pi-plus"
                                      size="small"
                                      onClick={handleAdd}
                                      type="button"
                                      className="ml-2"
                                    />
                                  </div>
                                </div>
                                {
                                  formik.values.computedFieldTriggerConfig.map((row: any, index: number) => (
                                    <SelectComputedFieldTriggerValues
                                      key={index}
                                      index={index}
                                      row={row}
                                      onChange={handleChange}
                                      onDelete={handleDelete}
                                      isLastRow={index === formik.values.computedFieldTriggerConfig.length - 1}
                                      disableDelete={formik.values.computedFieldTriggerConfig.length === 1}
                                      formik={formik}
                                      isFormFieldValid={isFormFieldValid}
                                      searchModuleName={searchModuleName}
                                      searchModelName={computedFieldSearchHandlers[index]}
                                      modelMetaData={modelMetaData}
                                      errors={formik.errors.computedFieldTriggerConfig?.[index]}
                                    />
                                  ))}
                                {typeof formik.errors.computedFieldTriggerConfig === 'string' && (
                                  <Message
                                    severity="error"
                                    text={formik.errors.computedFieldTriggerConfig}
                                  />
                                )}
                              </div>
                            )}
                          {/* {currentFields.includes("externalIdProvider") && (
                            <div className="md:col-6 sm:col-12">
                              <div className="field col-6 flex-flex-column gap-2">
                                <label
                                  htmlFor="externalIdProvider"
                                  className="form-field-label"
                                >
                                  External Id Provider
                                </label>
                                <SingleSelectAutoCompleteField
                                  key="externalIdProvider"
                                  formik={formik}
                                  isFormFieldValid={isFormFieldValid}
                                  // relationField={false}
                                  fieldName="externalIdProvider"
                                  fieldNameId={null}
                                  labelKey="label"
                                  valueKey="value"
                                  searchData={searchExternalIdProvider}
                                  existingData={formik.values.externalIdProvider}
                                  additionalAction={(e: any) => setMarkdownText(e.target.value.help)}
                                />
                               

                                {isFormFieldValid(
                                  formik,
                                  "externalIdProvider"
                                ) && (
                                    <Message
                                      severity="error"
                                      text={formik?.errors?.externalIdProvider?.toString()}
                                    />
                                  )}
                              </div>
                            </div>
                          )} */}

                          {currentFields.includes("selectionDynamicProviderCtxt") && (
                            // {/* {markdownText &&
                            //       <div className="md:col-12 sm:col-12">
                            //         <div className="field col-6 flex-flex-column gap-2">
                            //           <label htmlFor="name" className="form-field-label">
                            //             Markdown
                            //           </label>
                            //           <MarkdownViewer data={markdownText}></MarkdownViewer>
                            //         </div>
                            //       </div>
                            //     } */}

                            <div className="field col-12 flex-flex-column gap-2 mt-4">
                              <label htmlFor="selectionDynamicProviderCtxt" className="form-field-label">
                                Selection Dynamic Provider Context
                              </label>
                              <CodeEditor
                                formik={formik}
                                field="selectionDynamicProviderCtxt" >
                              </CodeEditor>
                              <div className=" form-field-label  mt-4">{markdownText}</div>

                              {isFormFieldValid(
                                formik,
                                "selectionDynamicProviderCtxt"
                              ) && (
                                  <Message
                                    severity="error"
                                    text={formik?.errors?.selectionDynamicProviderCtxt?.toString()}
                                  />
                                )}
                            </div>
                            // {/* {currentFields.includes("markdown") && ( */}

                          )}

                          {currentFields.includes("computedFieldValueProviderCtxt") && (
                            <div className="field col-12 flex-flex-column gap-2 mt-4">
                              <label htmlFor="computedFieldValueProviderCtxt" className="form-field-label">
                                Computed Field Value Provider Context
                              </label>
                              <CodeEditor
                                formik={formik}
                                field="computedFieldValueProviderCtxt" >
                              </CodeEditor>
                              <div className="form-field-label mt-4">{markdownText}</div>

                              {isFormFieldValid(
                                formik,
                                "computedFieldValueProviderCtxt"
                              ) && (
                                  <Message
                                    severity="error"
                                    text={formik?.errors?.computedFieldValueProviderCtxt?.toString()}
                                  />
                                )}
                            </div>
                          )}

                          {/* {currentFields.includes("externalIdProviderCtxt") && (
                            <div className="md:col-12 sm:col-12">

                              <div className="formgrid grid">
                                {markdownText &&
                                  <div className="md:col-12 sm:col-12">
                                    <div className="field col-6 flex-flex-column gap-2">
                                      <label htmlFor="name" className="form-field-label">
                                        Markdown
                                      </label>
                                      <MarkdownViewer data={markdownText}></MarkdownViewer>
                                    </div>
                                  </div>
                                }
                                <div className="md:col-12 sm:col-12">
                                  <div className="field col-6 flex-flex-column gap-2">
                                    <label htmlFor="name" className="form-field-label">
                                      External Id Provider Context
                                    </label>
                                    <CodeEditor
                                      formik={formik}
                                      field="externalIdProviderCtxt" >
                                    </CodeEditor>
                                    {isFormFieldValid(
                                      formik,
                                      "externalIdProviderCtxt"
                                    ) && (
                                        <Message
                                          severity="error"
                                          text={formik?.errors?.externalIdProviderCtxt?.toString()}
                                        />
                                      )}
                                  </div>
                                </div>

                              </div>
                            </div>
                          )} */}

                        </div>
                      )}
                      {(currentFields.includes("regexPattern") || currentFields.includes("min") || currentFields.includes("max") || currentFields.includes("ormType")) && ormTypeOptions && selectedType.value !== 'relation' &&
                        <>
                          <p className="form-wrapper-heading text-base mt-3">Validations</p>
                          <div className="formgrid grid">
                            {(currentFields.includes("regexPattern") && selectedType.value === "password") &&
                              <>
                                <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3">
                                  <label
                                    htmlFor="regexPattern"
                                    className="form-field-label"
                                  >
                                    Password Policy
                                  </label>
                                  <Dropdown value={selectedPasswordPolicy} onChange={(e: DropdownChangeEvent) => {
                                    setSelectedPasswordPolicy(e.value)
                                    if (e.value !== "custom") {
                                      formik.setFieldValue('regexPattern', e.value)
                                    }
                                  }} options={passwordPolicyOptions} optionLabel="label"
                                    placeholder="Select a Password Policy"
                                    // className="w-full md:w-14rem"
                                    className=""
                                    panelClassName="password-policy-dropdown-panel"
                                    checkmark={true} highlightOnSelect={false} />

                                </div>
                              </>
                            }
                            {currentFields.includes("regexPattern") && (
                              <>
                                <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3">
                                  <label
                                    htmlFor="regexPattern"
                                    className="form-field-label"
                                  >
                                    Regex Pattern
                                  </label>
                                  <InputText
                                    type="text"
                                    id="regexPattern"
                                    name="regexPattern"
                                    onChange={formik.handleChange}
                                    value={formik.values.regexPattern}
                                    className={classNames("", {
                                      "p-invalid": isFormFieldValid(
                                        formik,
                                        "regexPattern"
                                      ),
                                    })}
                                  />
                                  {isFormFieldValid(formik, "regexPattern") && (
                                    <Message
                                      severity="error"
                                      text={formik?.errors?.regexPattern?.toString()}
                                    />
                                  )}
                                </div>
                                {currentFields.includes("regexPattern") && (
                                  <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3 mb-3 md:mb-3">
                                    <label
                                      htmlFor="regexPatternNotMatchingErrorMsg"
                                      className="form-field-label"
                                    >
                                      Regex Pattern Not Matching Error Msg
                                    </label>
                                    <InputText
                                      type="text"
                                      id="regexPatternNotMatchingErrorMsg"
                                      name="regexPatternNotMatchingErrorMsg"
                                      onChange={formik.handleChange}
                                      value={formik.values.regexPatternNotMatchingErrorMsg}
                                      className={classNames("", {
                                        "p-invalid": isFormFieldValid(
                                          formik,
                                          "regexPatternNotMatchingErrorMsg"
                                        ),
                                      })}
                                    />
                                    {isFormFieldValid(formik, "regexPatternNotMatchingErrorMsg") && (
                                      <Message
                                        severity="error"
                                        text={formik?.errors?.regexPatternNotMatchingErrorMsg?.toString()}
                                      />
                                    )}
                                  </div>
                                )}
                              </>

                            )}
                            {(currentFields.includes("min") || currentFields.includes("max")) &&
                              <>
                                {currentFields.includes("min") && (
                                  <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-2 md:mt-3">
                                    <label htmlFor="min" className="form-field-label">
                                      Min {(selectedType.value !== "int" && selectedType.value !== "decimal") && `(Characters Allowed)`}

                                    </label>
                                    {/* <InputText
                                type="text"
                                id="min"
                                name="min"
                                onChange={formik.handleChange}
                                value={formik.values.min}
                                className={classNames("", {
                                  "p-invalid": isFormFieldValid(formik, "min"),
                                })}
                              /> */}
                                    {/* <RenderMinValueInput></RenderMinValueInput> */}
                                    {(selectedType.value === "int" ||
                                      selectedType.value === "decimal" ||
                                      selectedType.value === "shortText" ||
                                      selectedType.value === "decimal" ||
                                      selectedType.value === "longText" ||
                                      selectedType.value === "richText" ||
                                      selectedType.value === "password" ||
                                      selectedType.value === "json") &&
                                      <InputNumber
                                        id="min"
                                        name="min"
                                        onValueChange={formik.handleChange}
                                        value={formik.values.min}
                                        className={classNames("", {
                                          "p-invalid": isFormFieldValid(
                                            formik,
                                            "min"
                                          ),
                                        })}
                                        disabled={fieldMetaData?.id}
                                      />
                                    }

                                    {isFormFieldValid(formik, "min") && (
                                      <Message
                                        severity="error"
                                        text={formik?.errors?.min?.toString()}
                                      />
                                    )}
                                  </div>
                                )}
                                {currentFields.includes("max") && (
                                  <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3">
                                    <label htmlFor="max" className="form-field-label">
                                      Max {(selectedType.value !== "int" &&
                                        selectedType.value !== "decimal") && `(Characters allowed)`}
                                    </label>
                                    {/* <InputText
                                type="text"
                                id="max"
                                name="max"
                                onChange={formik.handleChange}
                                value={formik.values.max}
                                className={classNames("", {
                                  "p-invalid": isFormFieldValid(formik, "max"),
                                })}
                              /> */}
                                    {(selectedType.value === "int" ||
                                      selectedType.value === "decimal" ||
                                      selectedType.value === "shortText" ||
                                      selectedType.value === "decimal" ||
                                      selectedType.value === "longText" ||
                                      selectedType.value === "richText" ||
                                      selectedType.value === "password" ||
                                      selectedType.value === "json") &&
                                      <InputNumber
                                        id="max"
                                        name="max"
                                        onValueChange={formik.handleChange}
                                        value={formik.values.max}
                                        className={classNames("", {
                                          "p-invalid": isFormFieldValid(
                                            formik,
                                            "max"
                                          ),
                                        })}
                                        disabled={fieldMetaData?.id}
                                      />
                                    }

                                    {isFormFieldValid(formik, "max") && (
                                      <Message
                                        severity="error"
                                        text={formik?.errors?.max?.toString()}
                                      />
                                    )}
                                  </div>
                                )}
                              </>
                            }
                            {currentFields.includes("ormType") && (
                              <div className="col-12">
                                {ormTypeOptions && ormTypeOptions.length > 1 &&
                                  <div className="field col-12 md:col-6 flex-flex-column gap-2 mt-3">
                                    <label htmlFor="ormType" className="form-field-label">
                                      Type
                                    </label>
                                    {/* <SingleSelectAutoCompleteField
                                key="ormType"
                                formik={formik}
                                isFormFieldValid={isFormFieldValid}
                                fieldName="ormType"
                                fieldNameId="ormType"
                                labelKey="label"
                                valueKey="value"
                                searchData={searchOrmTypes}
                                existingData={formik.values.ormType}
                              /> */}

                                    <div className="ormTypeflex">
                                      {ormTypeOptions && ormTypeOptions.map((ormType: any) => {
                                        return (
                                          <>
                                            <div key={ormType.key} className="mr-3 align-items-center">
                                              <RadioButton inputId={ormType.label} name="ormType" value={ormType.label} onChange={(e) => {
                                                formik.setFieldValue("ormType", e.value);
                                                setSelectedOrmType(e.value)
                                              }} checked={selectedOrmType === ormType.label} />
                                              <label htmlFor={ormType.label} className="ml-2">{ormType.label}<br></br>
                                                <span className="ml-4 fieldSubTitle">{ormType.description}</span>
                                              </label>
                                            </div>

                                          </>
                                        );
                                      })}

                                    </div>

                                    {isFormFieldValid(formik, "ormType") && (
                                      <Message
                                        severity="error"
                                        text={formik?.errors?.ormType?.toString()}
                                      />
                                    )}
                                  </div>
                                }

                              </div>
                            )}
                          </div>
                        </>
                      }

                      {(formik.values.relationType !== "many-to-many" && formik.values.relationType !== "one-to-many") && <p className="form-wrapper-heading text-base mt-3">Settings</p>}
                      <div className="formgrid grid mt-3 md:mt-0">
                        {currentFields.includes("required") && (formik.values.relationType !== "many-to-many" && formik.values.relationType !== "one-to-many") && (
                          <div className="field col-6 flex-flex-column gap-2 mt-3">
                            <div className="flex align-items-center">
                              <Checkbox
                                name="required"
                                onChange={(e) => {
                                  if (!formik.values.isPrimaryKey && !formik.values.unique) {
                                    formik.setFieldValue("required", e.checked);
                                  }
                                }}
                                checked={formik.values.required}
                                disabled={formik.values.isPrimaryKey || formik.values.unique}
                              ></Checkbox>
                              <label htmlFor="ingredient1" className="form-field-label ml-2">
                                Required {formik.values.isPrimaryKey && "(Auto-enabled for Primary Key)"}
                                 {!formik.values.isPrimaryKey && formik.values.unique && "(Auto-enabled for Unique)"}
                              </label>
                            </div>
                            <p className="text-xs mt-2">You won't be able to create an entry if this field is empty</p>

                            {isFormFieldValid(formik, "required") && (
                              <Message
                                severity="error"
                                text={formik?.errors?.required?.toString()}
                              />
                            )}
                          </div>
                        )}
                        {currentFields.includes("unique") && selectedType.value !== 'relation' && (
                          <div className="field col-6 flex-flex-column gap-2">
                            <div className="flex align-items-center">
                              <Checkbox
                                name="unique"
                                onChange={(e) => {
                                  // Prevent unchecking if isPrimaryKey is true
                                  if (!formik.values.isPrimaryKey) {
                                    formik.setFieldValue("unique", e.checked);
                                    formik.setFieldValue("isUserKey", false);
                                    // Auto-enable required when unique is checked
                                    if (e.checked) {
                                      formik.setFieldValue("required", true);
                                    }else{
                                      formik.setFieldValue("required", false);
                                    }
                                  }
                                }}
                                checked={formik.values.unique}
                                disabled={formik.values.isPrimaryKey}
                              ></Checkbox>
                              <label htmlFor="ingredient1" className="form-field-label ml-2">
                                Unique {formik.values.isPrimaryKey && "(Auto-enabled for Primary Key)"}
                              </label>
                            </div>
                            <p className="text-xs mt-2">You won't be able to create an entry if there is an existing entry with identical content</p>

                            {isFormFieldValid(formik, "unique") && (
                              <Message
                                severity="error"
                                text={formik?.errors?.unique?.toString()}
                              />
                            )}
                          </div>
                        )}
                        {currentFields.includes("index") && selectedType.value !== 'relation' && (
                          <div className="field col-6 flex-flex-column gap-2 mt-3">
                            <div className="flex align-items-center">
                              <Checkbox
                                name="index"
                                onChange={(e) => {
                                  formik.setFieldValue("index", e.checked);
                                }}
                                checked={formik.values.index}
                              ></Checkbox>
                              <label htmlFor="ingredient1" className="form-field-label ml-2">
                                Index
                              </label>
                            </div>
                            {isFormFieldValid(formik, "index") && (
                              <Message
                                severity="error"
                                text={formik?.errors?.index?.toString()}
                              />
                            )}
                          </div>
                        )}
                        {currentFields.includes("private") && selectedType.value !== 'relation' && (
                          <div className="field col-6 flex-flex-column gap-2 mt-3">
                            <div className="flex align-items-center">
                              <Checkbox
                                name="private"
                                onChange={(e) => {
                                  formik.setFieldValue("private", e.checked);
                                }}
                                checked={formik.values.private}
                              ></Checkbox>
                              <label htmlFor="ingredient1" className="form-field-label ml-2">
                                Private
                              </label>
                            </div>
                            <p className="text-xs mt-2">This field will not show up in the API response</p>


                            {isFormFieldValid(formik, "private") && (
                              <Message
                                severity="error"
                                text={formik?.errors?.private?.toString()}
                              />
                            )}
                          </div>
                        )}
                        {currentFields.includes("encrypt") && selectedType.value !== 'relation' && (
                          <div className="field col-6 flex-flex-column gap-2 mt-3">
                            <div className="flex align-items-center gap-2">
                              <Checkbox
                                name="encrypt"
                                onChange={(e) => {
                                  formik.setFieldValue("encrypt", e.checked);
                                  setEncryptState(e.checked);
                                }}
                                checked={formik.values.encrypt}
                              ></Checkbox>
                              <label htmlFor="ingredient1" className="form-field-label">
                                Encrypt
                              </label>
                            </div>
                            {isFormFieldValid(formik, "encrypt") && (
                              <Message
                                severity="error"
                                text={formik?.errors?.encrypt?.toString()}
                              />
                            )}
                          </div>
                        )}
                        {currentFields.includes("isMultiSelect") && (
                          <div className="field col-6 flex-flex-column gap-2 mt-3">
                            <div className="flex align-items-center">
                              <Checkbox
                                name="isMultiSelect"
                                onChange={(e) => {
                                  formik.setFieldValue("isMultiSelect", e.checked);
                                }}
                                checked={formik.values.isMultiSelect}
                              ></Checkbox>
                              <label htmlFor="ingredient1" className="form-field-label ml-2">
                                Is MultiSelect
                              </label>
                            </div>
                            {isFormFieldValid(formik, "isMultiSelect") && (
                              <Message
                                severity="error"
                                text={formik?.errors?.isMultiSelect?.toString()}
                              />
                            )}
                          </div>
                        )}
                        {/* {currentFields.includes("isSystem") && (
                          <div className="md:col-6 sm:col-12">
                            <div className="field">
                              <div className="flex align-items-center">
                                <Checkbox
                                  name="isSystem"
                                  onChange={(e) => {
                                    formik.setFieldValue("isSystem", e.checked);
                                  }}
                                  checked={formik.values.isSystem}
                                ></Checkbox>
                                <label htmlFor="ingredient1" className="form-field-label">
                                  isSystem
                                </label>
                              </div>
                              {isFormFieldValid(formik, "isSystem") && (
                                <Message
                                  severity="error"
                                  text={formik?.errors?.isSystem?.toString()}
                                />
                              )}
                            </div>
                          </div>
                        )} */}
                        {currentFields.includes("enableAuditTracking") && formik.values.relationType !== "one-to-many" && (
                          <div className="field col-6 flex-flex-column gap-2 mt-3">
                            <div className="flex align-items-center gap-2">
                              <Checkbox
                                name="enableAuditTracking"
                                onChange={(e) => {
                                  formik.setFieldValue("enableAuditTracking", e.checked);
                                }}
                                checked={formik.values.enableAuditTracking}
                              ></Checkbox>
                              <label htmlFor="ingredient1" className="form-field-label">
                                Enable Audit Tracking
                              </label>
                            </div>
                            <p className="fieldSubTitle">By selecting this option, you are setting audit trail for this field.</p>

                            {isFormFieldValid(formik, "enableAuditTracking") && (
                              <Message
                                severity="error"
                                text={formik?.errors?.enableAuditTracking?.toString()}
                              />
                            )}
                          </div>
                        )}
                        {currentFields.includes("isUserKey") && formik.values.unique && (
                          <div className="field col-6 flex-flex-column gap-2 mt-3">
                            <div className="flex align-items-center gap-2">
                              <Checkbox
                                name="isUserKey"
                                onChange={(e) => {
                                  formik.setFieldValue("isUserKey", e.checked);
                                }}
                                checked={formik.values.isUserKey}
                              ></Checkbox>
                              <label htmlFor="ingredient1" className="form-field-label">
                                Is Userkey
                              </label>
                            </div>
                            <p className="fieldSubTitle">By selecting this option, you are setting this field as the model's user key. Any existing user key configuration will be overwritten</p>

                            {isFormFieldValid(formik, "isUserKey") && (
                              <Message
                                severity="error"
                                text={formik?.errors?.isUserKey?.toString()}
                              />
                            )}
                          </div>
                        )}
                        {currentFields.includes("isPrimaryKey") && (modelMetaData?.isLegacyTable || modelMetaData?.isLegacyTableWithId) && (
                          <div className="field col-6 flex-flex-column gap-2 mt-3">
                            <div className="flex align-items-center gap-2">
                              <Checkbox
                                name="isPrimaryKey"
                                onChange={(e) => {
                                  formik.setFieldValue("isPrimaryKey", e.checked);
                                  // Auto-set required and unique when isPrimaryKey is checked
                                  if (e.checked) {
                                    formik.setFieldValue("required", true);
                                    formik.setFieldValue("unique", true);
                                  }
                                }}
                                checked={formik.values.isPrimaryKey}
                              ></Checkbox>
                              <label htmlFor="ingredient1" className="form-field-label">
                                Is Primary Key
                              </label>
                            </div>
                            <p className="fieldSubTitle">By selecting this option, you are setting this field as the primary key for this legacy table.</p>

                            {isFormFieldValid(formik, "isPrimaryKey") && (
                              <Message
                                severity="error"
                                text={formik?.errors?.isPrimaryKey?.toString()}
                              />
                            )}
                          </div>
                        )}
                      </div>


                      {formik.values.encrypt === true && (
                        <div className="formgrid grid mt-2">
                          <div className="md:col-6 sm:col-12">
                            <div className="field col-6 flex-flex-column gap-2">
                              <label
                                htmlFor="encryptionType"
                                className="form-field-label"
                              >
                                Encryption Type
                              </label>
                              {/* <AutoComplete
                                value={selectedEncryptionType}
                                suggestions={filteredSelectionEncryptionType}
                                invalid={isFormFieldValid(
                                  formik,
                                  "encryptionType"
                                )}
                                completeMethod={searchSelectionEncryptionType}
                                virtualScrollerOptions={{ itemSize: 38 }}
                                field="label"
                                className="small-input"
                                dropdown
                                onChange={(e) => {
                                  setSelectedEncryptionType(e.value);
                                  formik.setFieldValue("encryptionType", e.value.value);
                                }}
                              /> */}

                              <SingleSelectAutoCompleteField
                                key="encryptionType"
                                formik={formik}
                                isFormFieldValid={isFormFieldValid}
                                fieldName="encryptionType"
                                fieldNameId="encryptionType"
                                labelKey="label"
                                valueKey="value"
                                searchData={searchSelectionEncryptionType}
                                existingData={formik.values.encryptionType}
                              />
                              {isFormFieldValid(formik, "encryptionType") && (
                                <Message
                                  severity="error"
                                  text={formik?.errors?.encryptionType?.toString()}
                                />
                              )}
                            </div>
                          </div>
                          <div className="md:col-6 sm:col-12">
                            <div className="field col-6 flex-flex-column gap-2">
                              <label htmlFor="decryptWhen" className="form-field-label">
                                Decrypt When
                              </label>
                              {/* <AutoComplete
                                value={selectedDecryptWhen}
                                suggestions={filteredSelectionDecryptWhen}
                                invalid={isFormFieldValid(formik, "decryptWhen")}
                                completeMethod={searchSelectionDecryptWhen}
                                virtualScrollerOptions={{ itemSize: 38 }}
                                field="label"
                                className="small-input"
                                dropdown
                                onChange={(e) => {
                                  setSelectedeDecryptWhen(e.value);
                                  formik.setFieldValue("decryptWhen", e.value.value);
                                }}
                              /> */}

                              <SingleSelectAutoCompleteField
                                key="decryptWhen"
                                formik={formik}
                                isFormFieldValid={isFormFieldValid}
                                fieldName="decryptWhen"
                                fieldNameId="decryptWhen"
                                labelKey="label"
                                valueKey="value"
                                searchData={searchSelectionDecryptWhen}
                                existingData={formik.values.decryptWhen}
                              />
                              {isFormFieldValid(formik, "decryptWhen") && (
                                <Message
                                  severity="error"
                                  text={formik?.errors?.decryptWhen?.toString()}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </TabPanel>
                  </TabView>
                  <div className="flex gap-3">
                    <div>
                      <Button label="Finish" size="small" onClick={() => showError()} type="submit" />
                    </div>
                    <div>
                      <Button label="Cancel" size="small" severity="secondary" type="reset" onClick={() => setVisiblePopup(false)} outlined />
                    </div>
                  </div>
                </div>
                {/* <div className="ml-4">
                  <Button
                    label="Save"
                    onClick={() => showError(formik.validateForm)}
                    type="submit"
                  />
                </div> */}
              </div>
            </div>
          }

        </form>
      </div >
      <Dialog
        visible={isBackPopupVisible}
        header="Select Type"
        headerClassName="text-center"
        modal
        className="solid-confirm-dialog"
        footer={() => (
          <div className="flex gap-3">
            <Button label="Yes" icon="pi pi-check" size="small" type="reset" severity="danger" autoFocus onClick={() => {
              formik.resetForm()
              setIsBackPopupVisible(false);
              setShowTypeFilter(true);
            }} />
            <Button label="No" icon="pi pi-times" size="small" onClick={() => setIsBackPopupVisible(false)} />
          </div>
        )}
        onHide={() => setIsBackPopupVisible(false)}
      >
        <p>You have some unsaved data are you sure  you want to go back?</p>
      </Dialog>
    </div >
  );
};


export default FieldMetaDataForm;
