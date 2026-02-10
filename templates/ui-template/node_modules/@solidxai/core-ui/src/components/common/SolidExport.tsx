
import { useFormik } from "formik";
import './solid-export.css';
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import React, { useEffect, useRef, useState } from "react";
import { createSolidEntityApi } from "../../redux/api/solidEntityApi";
import { Dropdown } from "primereact/dropdown";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { useCreateExportTemplateMutation, useDeleteExportTemplateMutation, useGetExportTemplatesQuery } from "../../redux/api/exportTemplateApi";
import { downloadFileWithProgress } from '../../helpers/downloadFileWithProgress';
import { DownloadProgressToast } from "./DownloadProgressToast";
import { Checkbox } from "primereact/checkbox";
import { ERROR_MESSAGES } from "../../constants/error-messages";
interface FieldMetadata {
  displayName: string;
  type: string;
}
interface FilterColumns {
  name: string;
  key: string;
}
// Define the template option type
interface TemplateOption {
  name: string;
  code: string;
  fields: string[];
  templateFormat: string;
}
interface FormatOption {
  name: string;
  code: string;
  icon?: JSX.Element;
}
interface Question {
  key: string;
  name: string;
}
export const SolidExport = ({ listViewMetaData, filters }: any) => {
  const toast = useRef<Toast>(null);
  const entityApi = createSolidEntityApi("userViewMetadata");
  const { useUpsertSolidEntityMutation } = entityApi;

  const [upsertUserView] = useUpsertSolidEntityMutation();

  if (!listViewMetaData?.data) return null;

  const solidView = listViewMetaData.data.solidView;
  const solidFieldsMetadata = listViewMetaData.data.solidFieldsMetadata as Record<
    string,
    FieldMetadata
  >;
  if (!solidView || !solidFieldsMetadata) return null;

  const checkedFieldNames = new Set(
    solidView.layout.children.map((col: { attrs: { name: string } }) => col.attrs.name)
  );

  // const allColumns: FilterColumns[] = Object.entries(solidFieldsMetadata).map(
  //   ([key, field]) => ({
  //     name: field.displayName,
  //     key,
  //   })
  // );


  const excludedTypes = new Set(['mediaSingle', 'mediaMultiple']);
  const allColumns: FilterColumns[] = Object.entries(solidFieldsMetadata)
    .filter(([, field]) => !excludedTypes.has(field.type))
    .map(([key, field]) => ({
      name: field.displayName,
      key,
    }));

  const [createExportTemplate] = useCreateExportTemplateMutation();
  const [deleteExportTemplate] = useDeleteExportTemplateMutation();
  const { data: templatesData } = useGetExportTemplatesQuery({});
  const formik = useFormik({
    initialValues: {
      selectedColumns: allColumns.filter((col) => checkedFieldNames.has(col.key)),
    },
    onSubmit: (values) => {
      // console.log("Selected columns:", values.selectedColumns);
    }
  });

  const { selectedColumns } = formik.values;

  const availableColumns = allColumns.filter(
    (col) => !selectedColumns.some((selected) => selected.key === col.key)
  );
  const moveToSelected = (col: FilterColumns) => {
    formik.setFieldValue("selectedColumns", [...selectedColumns, col]);
  };
  const moveToAvailable = (col: FilterColumns) => {
    formik.setFieldValue("selectedColumns", selectedColumns.filter((c) => c.key !== col.key));
  };

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<FormatOption | null>({
    name: "CSV",
    code: "csv",
    icon: (
      <svg fill="#000000" width="16" height="16" viewBox="0 0 318.188 318.188" xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink">
        <g>
          <g>
            <g>
              <rect x="182.882" y="155.008" width="33.713" height="15" />
              <rect x="101.592" y="132.689" width="33.713" height="15" />
              <rect x="182.882" y="132.689" width="33.713" height="15" />
              <rect x="182.882" y="88.053" width="33.713" height="15" />
              <rect x="182.882" y="110.371" width="33.713" height="15" />
              <rect x="101.592" y="155.008" width="33.713" height="15" />
              <polygon points="112.09,123.663 112.09,123.662 118.286,113.621 124.548,123.662 134.588,123.662 123.647,107.909 133.82,91.54 123.911,91.54 118.33,101.472 112.53,91.54 102.906,91.54 112.925,107.228 102.269,123.663" />
              <path d="M201.02,249.514c-0.339,1.27-0.73,3.015-1.174,5.236c-0.445,2.222-0.741,4.073-0.889,5.555 c-0.127-2.053-0.847-5.691-2.158-10.918l-6.316-23.519h-14.092l15.139,46.401h14.759l15.202-46.401h-14.027L201.02,249.514z" />
              <rect x="142.457" y="110.371" width="33.713" height="15" />
              <rect x="142.457" y="88.053" width="33.713" height="15" />
              <path d="M283.149,52.723L232.624,2.197C231.218,0.79,229.311,0,227.321,0H40.342c-4.142,0-7.5,3.358-7.5,7.5v303.188 c0,4.142,3.358,7.5,7.5,7.5h237.504c4.142,0,7.5-3.358,7.5-7.5V58.025C285.346,56.036,284.556,54.129,283.149,52.723z M234.821,25.606l24.918,24.919h-24.918V25.606z M47.842,15h171.979v10.263H47.842V15z M47.842,303.188V40.263h171.979v17.763 c0,4.143,3.358,7.5,7.5,7.5h43.024v237.662H47.842z" />
              <rect x="142.457" y="132.689" width="33.713" height="15" />
              <path d="M122.372,235.484c1.969,0,3.809,0.275,5.523,0.826c1.713,0.55,3.428,1.227,5.141,2.031l3.841-9.871 c-4.57-2.18-9.362-3.27-14.378-3.27c-4.591,0-8.585,0.98-11.98,2.937c-3.396,1.957-5.999,4.755-7.808,8.395 c-1.81,3.64-2.714,7.86-2.714,12.663c0,7.682,1.867,13.553,5.602,17.615c3.734,4.063,9.104,6.094,16.107,6.094 c4.888,0,9.268-0.857,13.14-2.57v-10.602c-1.947,0.805-3.883,1.492-5.808,2.063c-1.926,0.571-3.915,0.857-5.967,0.857 c-6.793,0-10.188-4.464-10.188-13.393c0-4.295,0.836-7.665,2.507-10.109C117.062,236.707,119.39,235.484,122.372,235.484z" />
              <path d="M163.57,244.594c-4.169-1.904-6.724-3.216-7.665-3.936c-0.942-0.719-1.412-1.533-1.412-2.443 c-0.002-0.847,0.368-1.556,1.11-2.127c0.74-0.571,1.925-0.857,3.555-0.857c3.152,0,6.897,0.995,11.234,2.984l3.841-9.681 c-4.994-2.222-9.892-3.333-14.694-3.333c-5.439,0-9.713,1.196-12.822,3.587c-3.111,2.392-4.666,5.724-4.666,9.997 c0,2.285,0.365,4.264,1.095,5.936s1.851,3.152,3.364,4.443s3.782,2.624,6.809,3.999c3.343,1.503,5.4,2.497,6.173,2.983 c0.771,0.486,1.333,0.968,1.682,1.444c0.35,0.476,0.524,1.031,0.524,1.666c0,1.016-0.435,1.847-1.302,2.491 c-0.868,0.647-2.233,0.969-4.095,0.969c-2.158,0-4.527-0.344-7.109-1.032c-2.581-0.687-5.067-1.645-7.458-2.872v11.172 c2.264,1.079,4.443,1.836,6.538,2.27c2.095,0.434,4.687,0.65,7.775,0.65c3.703,0,6.93-0.619,9.681-1.856 c2.75-1.238,4.856-2.973,6.315-5.205c1.461-2.232,2.191-4.787,2.191-7.665c0-3.131-0.777-5.729-2.333-7.792 C170.346,248.323,167.569,246.393,163.57,244.594z" />
              <rect x="142.457" y="155.008" width="33.713" height="15" />
            </g>
          </g>
        </g>
      </svg>
    ),
  });
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);
  //loading hardcode format
  const [formatOptions, setFormatOptions] = useState<FormatOption[]>([
    {
      name: "CSV",
      code: "csv",
      icon: (
        <svg fill="#000000" width="16" height="16" viewBox="0 0 318.188 318.188" xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink">
          <g>
            <g>
              <g>
                <rect x="182.882" y="155.008" width="33.713" height="15" />
                <rect x="101.592" y="132.689" width="33.713" height="15" />
                <rect x="182.882" y="132.689" width="33.713" height="15" />
                <rect x="182.882" y="88.053" width="33.713" height="15" />
                <rect x="182.882" y="110.371" width="33.713" height="15" />
                <rect x="101.592" y="155.008" width="33.713" height="15" />
                <polygon points="112.09,123.663 112.09,123.662 118.286,113.621 124.548,123.662 134.588,123.662 123.647,107.909 133.82,91.54 123.911,91.54 118.33,101.472 112.53,91.54 102.906,91.54 112.925,107.228 102.269,123.663" />
                <path d="M201.02,249.514c-0.339,1.27-0.73,3.015-1.174,5.236c-0.445,2.222-0.741,4.073-0.889,5.555 c-0.127-2.053-0.847-5.691-2.158-10.918l-6.316-23.519h-14.092l15.139,46.401h14.759l15.202-46.401h-14.027L201.02,249.514z" />
                <rect x="142.457" y="110.371" width="33.713" height="15" />
                <rect x="142.457" y="88.053" width="33.713" height="15" />
                <path d="M283.149,52.723L232.624,2.197C231.218,0.79,229.311,0,227.321,0H40.342c-4.142,0-7.5,3.358-7.5,7.5v303.188 c0,4.142,3.358,7.5,7.5,7.5h237.504c4.142,0,7.5-3.358,7.5-7.5V58.025C285.346,56.036,284.556,54.129,283.149,52.723z M234.821,25.606l24.918,24.919h-24.918V25.606z M47.842,15h171.979v10.263H47.842V15z M47.842,303.188V40.263h171.979v17.763 c0,4.143,3.358,7.5,7.5,7.5h43.024v237.662H47.842z" />
                <rect x="142.457" y="132.689" width="33.713" height="15" />
                <path d="M122.372,235.484c1.969,0,3.809,0.275,5.523,0.826c1.713,0.55,3.428,1.227,5.141,2.031l3.841-9.871 c-4.57-2.18-9.362-3.27-14.378-3.27c-4.591,0-8.585,0.98-11.98,2.937c-3.396,1.957-5.999,4.755-7.808,8.395 c-1.81,3.64-2.714,7.86-2.714,12.663c0,7.682,1.867,13.553,5.602,17.615c3.734,4.063,9.104,6.094,16.107,6.094 c4.888,0,9.268-0.857,13.14-2.57v-10.602c-1.947,0.805-3.883,1.492-5.808,2.063c-1.926,0.571-3.915,0.857-5.967,0.857 c-6.793,0-10.188-4.464-10.188-13.393c0-4.295,0.836-7.665,2.507-10.109C117.062,236.707,119.39,235.484,122.372,235.484z" />
                <path d="M163.57,244.594c-4.169-1.904-6.724-3.216-7.665-3.936c-0.942-0.719-1.412-1.533-1.412-2.443 c-0.002-0.847,0.368-1.556,1.11-2.127c0.74-0.571,1.925-0.857,3.555-0.857c3.152,0,6.897,0.995,11.234,2.984l3.841-9.681 c-4.994-2.222-9.892-3.333-14.694-3.333c-5.439,0-9.713,1.196-12.822,3.587c-3.111,2.392-4.666,5.724-4.666,9.997 c0,2.285,0.365,4.264,1.095,5.936s1.851,3.152,3.364,4.443s3.782,2.624,6.809,3.999c3.343,1.503,5.4,2.497,6.173,2.983 c0.771,0.486,1.333,0.968,1.682,1.444c0.35,0.476,0.524,1.031,0.524,1.666c0,1.016-0.435,1.847-1.302,2.491 c-0.868,0.647-2.233,0.969-4.095,0.969c-2.158,0-4.527-0.344-7.109-1.032c-2.581-0.687-5.067-1.645-7.458-2.872v11.172 c2.264,1.079,4.443,1.836,6.538,2.27c2.095,0.434,4.687,0.65,7.775,0.65c3.703,0,6.93-0.619,9.681-1.856 c2.75-1.238,4.856-2.973,6.315-5.205c1.461-2.232,2.191-4.787,2.191-7.665c0-3.131-0.777-5.729-2.333-7.792 C170.346,248.323,167.569,246.393,163.57,244.594z" />
                <rect x="142.457" y="155.008" width="33.713" height="15" />
              </g>
            </g>
          </g>
        </svg>
      ),
    },
    {
      name: "Excel",
      code: "excel",
      icon: (
        <svg version="1.1" id="Layer_1" x="0px" y="0px"
          fill="#000000" viewBox="0 0 512 512" width="16" height="16">
          <g>
            <g>
              <g>
                <path d="M447.168,134.56c-0.535-1.288-1.318-2.459-2.304-3.445l-128-128c-2.003-1.988-4.709-3.107-7.531-3.115H74.667
              C68.776,0,64,4.776,64,10.667v490.667C64,507.224,68.776,512,74.667,512h362.667c5.891,0,10.667-4.776,10.667-10.667V138.667
              C447.997,137.256,447.714,135.86,447.168,134.56z M320,36.416L411.584,128H320V36.416z M426.667,490.667H85.333V21.333h213.333
              v117.333c0,5.891,4.776,10.667,10.667,10.667h117.333V490.667z"/>
                <path d="M128,181.333v256c0,5.891,4.776,10.667,10.667,10.667h234.667c5.891,0,10.667-4.776,10.667-10.667v-256
              c0-5.891-4.776-10.667-10.667-10.667H138.667C132.776,170.667,128,175.442,128,181.333z M320,192h42.667v42.667H320V192z
              M320,256h42.667v42.667H320V256z M320,320h42.667v42.667H320V320z M320,384h42.667v42.667H320V384z M213.333,192h85.333v42.667
              h-85.333V192z M213.333,256h85.333v42.667h-85.333V256z M213.333,320h85.333v42.667h-85.333V320z M213.333,384h85.333v42.667
              h-85.333V384z M149.333,192H192v42.667h-42.667V192z M149.333,256H192v42.667h-42.667V256z M149.333,320H192v42.667h-42.667V320z
              M149.333,384H192v42.667h-42.667V384z"/>
              </g>
            </g>
          </g>
        </svg>
      ),
    },
  ]);

  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const steps = [
    { label: 'Export', value: 'export' },
    { label: 'Summary', value: 'summary' },
  ];
  const [currentStepValue, setCurrentStepValue] = useState('export');

  useEffect(() => {
    if (templatesData?.records && templatesData.records.length > 0) {
      const templates = templatesData.records.map((template: any) => ({
        name: template.templateName,
        code: template.id,
        fields: template.fields,
        templateFormat: template.templateFormat
      }));
      setTemplateOptions([...templates]);
    }
  }, [templatesData]);

  const handleAddTemplate = async () => {
    setIsDialogVisible(false);
    const tname = newTemplateName.trim();
    if ((selectedTemplate?.name || tname) && selectedFormat) {
      setNewTemplateName("");
      setIsDialogVisible(false);
      let customSelectedFields = selectedColumns.map((col) => col.key);
      const fieldsData = JSON.stringify(customSelectedFields)
      const exportData = {
        templateName: tname || selectedTemplate?.name || "",
        templateFormat: selectedFormat?.code || "",
        notifyOnEmail: true,
        fields: fieldsData,
        modelMetadataId: solidView?.model?.id,
      };

      try {
        const response = await createExportTemplate(exportData).unwrap();
        toast?.current?.show({
          severity: "success",
          summary: "Template Added",
          detail: "Template Saved",
        });
        let newAddedTemplate: TemplateOption = {
          name: selectedTemplate?.name || "",
          code: response.data.id,
          fields: customSelectedFields,
          templateFormat: selectedFormat?.code || "",
        };
        setTemplateOptions((prev) => [...prev, newAddedTemplate]);
        // ✅ Select the newly added template
        setSelectedTemplate(newAddedTemplate);
        // ✅ Re-assign the selected format from options list
        setSelectedFormat(formatOptions.find((format) => format.code === selectedFormat?.code) || null);
      } catch (err) {
        console.error(ERROR_MESSAGES.TEMPLATE_FAILED, err);
      }
    } else {
      toast?.current?.show({
        severity: "error",
        summary: ERROR_MESSAGES.TEMPLATE_FAILED,
        detail: ERROR_MESSAGES.TEMPLATE_FAILED,
      });
    }
  };

  const panelFooterTemplate = () => (
    <div className="p-1">
      <Button
        label="Add New Template"
        icon="pi pi-plus"
        className="p-button"
        onClick={() => setIsDialogVisible(true)}
      />
    </div>
  );

  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [message, setMessage] = useState("");
  const [messageDescription, setMessageDescription] = useState("");
  const [status, setStatus] = useState("In Progress");
  const [checkApplyFilter, setCheckedApplyFilter] = useState(false);
  const downloadHandlers = {
    onProgress: (value: number) => {
      setProgress(value);
    },
    onStatusChange: (statusType: "In Progress" | "success" | "error", msg: string, submsg: string) => {
      setStatus(statusType);
      setMessage(msg);
      setMessageDescription(submsg);
      setShowProgress(true);
    },
  };
  const handleDownload = async () => {
    const id = selectedTemplate?.code ? selectedTemplate?.code : null;
    const tname = newTemplateName?.trim() || selectedTemplate?.name || null;
    let customSelectedFields = selectedColumns.map((col) => col.key);
    const fieldsData = JSON.stringify(customSelectedFields)
    const exportData = {
      id: id,
      templateName: tname,
      templateFormat: selectedFormat?.code || "",
      notifyOnEmail: true,
      fields: fieldsData,
      modelMetadataId: solidView?.model?.id,
    };
    // setNewTemplateName("");
    setIsDialogVisible(false);
    try {
      await downloadFileWithProgress(`/export-template/startExport/sync`, downloadHandlers, filters, checkApplyFilter, exportData);
    } catch (err) {
      console.error(ERROR_MESSAGES.DOWNLOAD_FAILED, err);
    }
  };

  const handleTemplateChange = (e: any) => {
    const selected = templateOptions.find((option) => option.code === e.value.code);
    setSelectedTemplate(selected || null);
    if (selected) {
      let fields: string[] = [];
      if (typeof selected.fields === "string") {
        try {
          fields = JSON.parse(selected.fields);
        } catch (error) {
          console.error(ERROR_MESSAGES.PARSED_FIELD, error);
        }
      } else if (Array.isArray(selected.fields)) {
        fields = selected.fields;
      }

      const selectedFields = fields.map((field) => ({
        key: field,
        name: solidFieldsMetadata[field]?.displayName || field,
      }));

      formik.setFieldValue("selectedColumns", selectedFields);
      setSelectedTemplate(selected);
      const format = formatOptions.find(f => f.code === selected.templateFormat);
      setSelectedFormat(format || null);
    } else {
      setSelectedTemplate(null);
    }
  };
  const renderSourceItem = (item: Question) => (
    <div key={item.key} className="flex justify-content-start align-items-center border-top-1 w-full p-1 SolidCustomPicklistItemWrapper SolidCustomPicklistSourceItem">
      <div className="flex items-center gap-2">
        <svg onClick={() => moveToSelected(item)} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g opacity="0.4">
            <rect x="0.5" y="0.5" width="15" height="15" rx="3.5" fill="white" stroke="#D9D9D9" />
            <path d="M7.42857 8.57143H4V7.42857H7.42857V4H8.57143V7.42857H12V8.57143H8.57143V12H7.42857V8.57143Z" fill="#4B4D52" />
          </g>
        </svg>
        <label htmlFor={item.key} className="text-sm font-semibold ml-2">
          {item.name}
        </label>
      </div>
    </div>
  );

  const renderTargetItem = (item: Question) => (
    <div key={item.key} className="flex justify-content-start align-items-center border-top-1 w-full p-1 pr-2 gap-2 SolidCustomPicklistItemWrapper">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.46672 11.7331C7.46672 12.0997 7.33616 12.4136 7.07505 12.6747C6.81394 12.9359 6.50005 13.0664 6.13338 13.0664C5.76672 13.0664 5.45283 12.9359 5.19172 12.6747C4.9306 12.4136 4.80005 12.0997 4.80005 11.7331C4.80005 11.3664 4.9306 11.0525 5.19172 10.7914C5.45283 10.5303 5.76672 10.3997 6.13338 10.3997C6.50005 10.3997 6.81394 10.5303 7.07505 10.7914C7.33616 11.0525 7.46672 11.3664 7.46672 11.7331ZM7.46672 7.73307C7.46672 8.09974 7.33616 8.41363 7.07505 8.67474C6.81394 8.93585 6.50005 9.06641 6.13338 9.06641C5.76672 9.06641 5.45283 8.93585 5.19172 8.67474C4.9306 8.41363 4.80005 8.09974 4.80005 7.73307C4.80005 7.36641 4.9306 7.05252 5.19172 6.79141C5.45283 6.5303 5.76672 6.39974 6.13338 6.39974C6.50005 6.39974 6.81394 6.5303 7.07505 6.79141C7.33616 7.05252 7.46672 7.36641 7.46672 7.73307ZM7.46672 3.73307C7.46672 4.09974 7.33616 4.41363 7.07505 4.67474C6.81394 4.93585 6.50005 5.06641 6.13338 5.06641C5.76672 5.06641 5.45283 4.93585 5.19172 4.67474C4.9306 4.41363 4.80005 4.09974 4.80005 3.73307C4.80005 3.36641 4.9306 3.05252 5.19172 2.79141C5.45283 2.5303 5.76672 2.39974 6.13338 2.39974C6.50005 2.39974 6.81394 2.5303 7.07505 2.79141C7.33616 3.05252 7.46672 3.36641 7.46672 3.73307Z" fill="black" fill-opacity="0.25" />
        <path d="M11.7333 11.7331C11.7333 12.0997 11.6028 12.4136 11.3417 12.6747C11.0805 12.9359 10.7667 13.0664 10.4 13.0664C10.0333 13.0664 9.71943 12.9359 9.45832 12.6747C9.19721 12.4136 9.06665 12.0997 9.06665 11.7331C9.06665 11.3664 9.19721 11.0525 9.45832 10.7914C9.71943 10.5303 10.0333 10.3997 10.4 10.3997C10.7667 10.3997 11.0805 10.5303 11.3417 10.7914C11.6028 11.0525 11.7333 11.3664 11.7333 11.7331ZM11.7333 7.73307C11.7333 8.09974 11.6028 8.41363 11.3417 8.67474C11.0805 8.93585 10.7667 9.06641 10.4 9.06641C10.0333 9.06641 9.71943 8.93585 9.45832 8.67474C9.19721 8.41363 9.06665 8.09974 9.06665 7.73307C9.06665 7.36641 9.19721 7.05252 9.45832 6.79141C9.71943 6.5303 10.0333 6.39974 10.4 6.39974C10.7667 6.39974 11.0805 6.5303 11.3417 6.79141C11.6028 7.05252 11.7333 7.36641 11.7333 7.73307ZM11.7333 3.73307C11.7333 4.09974 11.6028 4.41363 11.3417 4.67474C11.0805 4.93585 10.7667 5.06641 10.4 5.06641C10.0333 5.06641 9.71943 4.93585 9.45832 4.67474C9.19721 4.41363 9.06665 4.09974 9.06665 3.73307C9.06665 3.36641 9.19721 3.05252 9.45832 2.79141C9.71943 2.5303 10.0333 2.39974 10.4 2.39974C10.7667 2.39974 11.0805 2.5303 11.3417 2.79141C11.6028 3.05252 11.7333 3.36641 11.7333 3.73307Z" fill="black" fill-opacity="0.25" />
      </svg>
      <span className="text-sm font-semibold flex-1 ">{item.name}</span>
      <svg width="16" height="16" onClick={() => moveToAvailable(item)} cursor='pointer' viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="16" height="16" rx="8" fill="#F0F0F0" />
        <path d="M5.6 11L5 10.4L7.4 8L5 5.6L5.6 5L8 7.4L10.4 5L11 5.6L8.6 8L11 10.4L10.4 11L8 8.6L5.6 11Z" fill="#4B4D52" />
      </svg>
    </div>
  );
  const maxVisibleRows = Math.max(availableColumns.length, selectedColumns.length);
  const renderEmptyRow = (index: number) => (
    <div key={`empty-${index}`} className="SolidCustomPicklistItemWrapper" />
  );
  // Dialog footer (Save and Cancel buttons)
  const dialogFooter = (
    <div>
      <Button
        label="Save"
        className="p-button rounded"
        onClick={() => handleAddTemplate()}
        disabled={!newTemplateName.trim()}
      />
      <Button
        label="Cancel"
        className="ExportCancelButton"
        onClick={() => {
          setNewTemplateName("");
          setIsDialogVisible(false);
        }}
      />
    </div>
  );
  const handleDeleteTemplate = async (id: string) => {
    const response = await deleteExportTemplate(id).unwrap();
    setTemplateOptions((prev) => prev.filter((template) => template.code !== id));
    toast?.current?.show({
      severity: "success",
      summary: "Template Deleted",
      detail: "Template Deleted",
    });
  };
  const itemTemplate = (option: TemplateOption) => {
    return (
      <div className="flex align-items-center justify-content-between w-full py-1">
        <span className="ExportDropdownText">{option.name}</span>
        <svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" style={{ right: 0 }} className="ExportDropdownIcon" onClick={(e) => {
          e.stopPropagation(); // Prevent triggering selection
          handleDeleteTemplate(option.code);
        }}
          xmlns="http://www.w3.org/2000/svg">
          <path d="M7 4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2h4a1 1 0 1 1 0 2h-1.069l-.867 12.142A2 2 0 0 1 17.069 22H6.93a2 2 0 0 1-1.995-1.858L4.07 8H3a1 1 0 0 1 0-2h4V4zm2 2h6V4H9v2zM6.074 8l.857 12H17.07l.857-12H6.074zM10 10a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1zm4 0a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1z"
            fill="#ff3d32" /></svg>
      </div>
    );
  };

  return (
    <>
      <Toast ref={toast} />
      {/*<div className="flex align-items-center justify-content-between m-0 p-0">
       <SolidExportStepper
       solidFormViewWorkflowData={steps}
       activeValue={currentStepValue}
       setActiveValue={setCurrentStepValue} />
      </div> */}
      <div className="p-0">
        {currentStepValue === 'export' &&
          <>
            <div className="SolidExportControls mx-2 gap-2">
              <div className="flex align-items-center">
                <Checkbox inputId="applyFilters" onChange={e => setCheckedApplyFilter(!!e.checked)} checked={checkApplyFilter} />
                <label htmlFor="applyFilters" className="ml-2">  Apply Filters</label>
              </div>
              <Dropdown
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.value)}
                options={formatOptions}
                optionLabel="name"
                placeholder="Format ."
                className="p-dropdown p-outlined"

                // 👇 Render icon + text for dropdown list options
                itemTemplate={(option) => {
                  const isSelected = selectedFormat?.code === option.code;
                  const iconColor = isSelected ? "#722ED1" : "#000000"; // Blue for selected
                  return (
                    <div className="flex items-center gap-2 ">
                      {React.cloneElement(option.icon, { fill: iconColor })}
                      <span>{option.name}</span>
                    </div>
                  );
                }}

                // 👇 Render icon + text for selected value display
                valueTemplate={(option) => {
                  if (!option) return "Format .";
                  return (
                    <div className="flex items-center gap-2 h-1rem">
                      {React.cloneElement(option.icon, { fill: "#722ED1" })}
                      <span>{option.name}</span>
                    </div>
                  );
                }}
              />
              <Dropdown
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e)}
                options={templateOptions}
                optionLabel="name"
                placeholder="Template "
                className="p-dropdown hidden md:flex"
                itemTemplate={itemTemplate}
                panelFooterTemplate={panelFooterTemplate}
              />

              <Button
                className="p-button hidden md:flex"
                label="Export"
                disabled={!selectedFormat}
                onClick={() => handleDownload()}
              />
              <Button
                className="p-button md:hidden"
                label="Export"
                disabled={!selectedFormat}
                onClick={() => handleDownload()}
                size="small"
              />
            </div>
            <div className="col-12 sm:col-6 p-0 ">
              <Dropdown
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e)}
                options={templateOptions}
                optionLabel="name"
                placeholder="Template"
                className="p-dropdown md:hidden w-full mt-2 p-inputtext-sm"
                itemTemplate={itemTemplate}
                panelFooterTemplate={panelFooterTemplate}
              />
            </div>


            <Dialog
              header="Save Export Template"
              className="solid-confirm-dialog"
              visible={isDialogVisible}
              style={{ width: "20rem", right: "0" }}
              footer={dialogFooter}
              onHide={() => {
                setNewTemplateName("");
                setIsDialogVisible(false);
              }}
            >
              <label htmlFor="templateName" className="text-color-secondary">Title</label>
              <InputText
                id="templateName"
                name="templateName"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Enter template name"
                className="w-full"
                autoFocus
              />
            </Dialog>
            <div className="SolidCustomPicklist mt-2">
              <div className="flex">
                {/* All Questions */}
                <div className="w-6">
                  <div className="text-sm font-semibold SolidCustomPicklistSourceHeader" style={{ padding: '12px 16px', background: '#F3FAFF' }}>Available Fields</div>
                  <div>
                    {availableColumns.map(renderSourceItem)}
                    {Array.from({ length: maxVisibleRows - availableColumns.length }).map((_, i) =>
                      renderEmptyRow(i)
                    )}
                  </div>
                </div>

                {/* Selected Questions */}
                <div className="w-6">
                  <div className="text-sm font-semibold" style={{ padding: '12px 16px', background: '#F3FAFF' }} >Selected Fields</div>
                  <div>
                    {selectedColumns.map(renderTargetItem)}
                    {Array.from({ length: maxVisibleRows - selectedColumns.length }).map((_, i) =>
                      renderEmptyRow(i)
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        }
        {/* {currentStepValue === 'summary' && (
                <p className="m-0">
                Relations and Media Fields are not supported for Export.
                </p>
          )} */}
      </div>
      <DownloadProgressToast
        visible={showProgress}
        progress={progress}
        message={message}
        submessage={messageDescription}
        status={status}
        onClose={() => setShowProgress(false)}
      />
    </>
  );
};