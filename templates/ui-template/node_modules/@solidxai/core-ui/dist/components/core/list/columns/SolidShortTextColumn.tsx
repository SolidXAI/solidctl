
import { FilterMatchMode } from 'primereact/api';
import { Column, ColumnFilterElementTemplateOptions } from "primereact/column";
import { FormEvent } from "primereact/ts-helpers";
import { getNumberOfInputs, SolidListViewColumnParams } from '../SolidListViewColumn';
import { InputTypes, SolidVarInputsFilterElement } from "../SolidVarInputsFilterElement";
import SolidTableRowCell from '../SolidTableRowCell';
import { getExtensionComponent } from '../../../../helpers/registry';
import { SolidListFieldWidgetProps, SolidMediaListFieldWidgetProps, SolidShortTextImageRenderModeWidgetProps } from '../../../../types/solid-core';
import dayjs from 'dayjs';

const SolidShortTextColumn = ({ solidListViewMetaData, fieldMetadata, column, setLightboxUrls, setOpenLightbox }: SolidListViewColumnParams) => {
    const filterable = column.attrs.filterable;
    const showFilterOperator = false;
    const columnDataType = 'text';
    const filterMatchModeOptions = [
        { label: 'Starts With', value: FilterMatchMode.STARTS_WITH },
        { label: 'Contains', value: FilterMatchMode.CONTAINS },
        { label: 'Not Contains', value: FilterMatchMode.NOT_CONTAINS },
        { label: 'Ends With', value: FilterMatchMode.ENDS_WITH },
        { label: 'Equals', value: FilterMatchMode.EQUALS },
        { label: 'Not Equals', value: FilterMatchMode.NOT_EQUALS },
        { label: 'In', value: FilterMatchMode.IN },
        { label: 'Not In', value: FilterMatchMode.NOT_IN }
    ];
    const filterTemplate = (options: ColumnFilterElementTemplateOptions) => {
        const numberOfInputs = getNumberOfInputs(options.filterModel.matchMode);

        return (
            <SolidVarInputsFilterElement
                values={options.value}
                onChange={(e: FormEvent<HTMLInputElement>) => options.filterCallback(e, options.index)}
                numberOfInputs={numberOfInputs}
                inputType={InputTypes.Text}
                solidListViewMetaData={solidListViewMetaData}
                fieldMetadata={fieldMetadata}
                column={column}
            >
            </SolidVarInputsFilterElement >
        )
    };

    const truncateAfter = solidListViewMetaData?.data?.solidView?.layout?.attrs?.truncateAfter;
    const header = column.attrs.label ?? fieldMetadata.displayName;

    return (
        <Column
            key={fieldMetadata.name}
            field={fieldMetadata.name}
            // header={header}
            // className="text-sm"
            sortable={column.attrs.sortable}
            // filter={filterable}
            dataType={columnDataType}
            showFilterOperator={showFilterOperator}
            filterMatchModeOptions={filterMatchModeOptions}
            filterElement={filterTemplate}
            filterPlaceholder={`Search by ${fieldMetadata.displayName}`}
            // style={{ minWidth: "12rem" }}
            // headerClassName="table-header-fs"
            header={() => {
                return (<div style={{ maxWidth: truncateAfter ? `${truncateAfter}ch` : '30ch', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{header}</div>)
            }}

            body={(rowData) => {
                //add this widget to render media image in image format  - SolidShortTextFieldImageRenderModeWidget 
                let viewWidget = column.attrs.viewWidget;
                if (!viewWidget) {
                    viewWidget = 'DefaultTextListWidget';
                }
                let DynamicWidget = getExtensionComponent(viewWidget);
                const widgetProps: SolidMediaListFieldWidgetProps = {
                    rowData,
                    solidListViewMetaData,
                    fieldMetadata,
                    column,
                    setLightboxUrls: setLightboxUrls,
                    setOpenLightbox: setOpenLightbox
                }
                return (
                    <>
                        {DynamicWidget && <DynamicWidget {...widgetProps} />}
                    </>
                )
            }
            }

        ></Column >
    );

};

export default SolidShortTextColumn;

function parseIsoDate(value: string): Date | null {
    if (!value || typeof value !== "string") return null;

    // Fast reject (avoids false positives)
    if (!value.includes("T")) return null;

    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}


export const DefaultTextListWidget = ({ rowData, solidListViewMetaData, fieldMetadata, column }: SolidListFieldWidgetProps) => {
    const truncateAfter = solidListViewMetaData?.data?.solidView?.layout?.attrs?.truncateAfter;
    let displayValue = rowData[fieldMetadata.name];
    //    if (typeof displayValue === "string" && displayValue.includes("T") && displayValue.endsWith("Z")) {
    //         const d = new Date(displayValue);
    //         if (!isNaN(d.getTime())) {
    //             const year = d.getFullYear();
    //             const month = String(d.getMonth() + 1).padStart(2, "0");
    //             const day = String(d.getDate()).padStart(2, "0");
    //             const hours = String(d.getHours()).padStart(2, "0");
    //             const minutes = String(d.getMinutes()).padStart(2, "0");
    //             const seconds = String(d.getSeconds()).padStart(2, "0");

    //             displayValue = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.000`;
    //         }
    //     }
    if (typeof displayValue === "string") {
        const parsedDate = parseIsoDate(displayValue);

        if (parsedDate) {
            const format = column?.attrs?.format as string | undefined;

            // 🔵 Explicit format → dayjs
            if (format) {
                displayValue = dayjs(parsedDate).format(format);
            }
            // 🟢 Default → user locale
            else {
                displayValue = parsedDate.toLocaleString();
            }
        }
    }



    if (fieldMetadata?.selectionStaticValues && displayValue) {
        const mapping: Record<string, string> = {};

        fieldMetadata.selectionStaticValues.forEach((entry: string) => {
            const [val, label] = entry.split(":");
            mapping[val] = label;
        });

        const values = displayValue.split(",").map((v: string) => v.trim());

        displayValue = values.map((v: string) => mapping[v] || v).join(", ");
    }

    return (
        <SolidTableRowCell
            value={displayValue}
            truncateAfter={truncateAfter}
        />
    );
};
