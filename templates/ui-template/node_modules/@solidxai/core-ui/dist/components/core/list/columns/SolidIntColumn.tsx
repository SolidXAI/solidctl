
import { FilterMatchMode } from 'primereact/api';
import { Column, ColumnFilterElementTemplateOptions } from "primereact/column";
import { FormEvent } from "primereact/ts-helpers";
import { getNumberOfInputs, SolidListViewColumnParams } from '../SolidListViewColumn';
import { InputTypes, SolidVarInputsFilterElement } from "../SolidVarInputsFilterElement";
import SolidTableRowCell from '../SolidTableRowCell';
import { getExtensionComponent } from '../../../../helpers/registry';
import { SolidListFieldWidgetProps } from '../../../../types/solid-core';

const SolidIntColumn = ({ solidListViewMetaData, fieldMetadata, column }: SolidListViewColumnParams) => {
    const filterable = column.attrs.filterable;
    const showFilterOperator = false;
    const columnDataType = 'numeric';
    const filterTemplate = (options: ColumnFilterElementTemplateOptions) => {
        const numberOfInputs = getNumberOfInputs(options.filterModel.matchMode);
        return (
            <SolidVarInputsFilterElement
                values={options.value}
                onChange={(e: FormEvent<HTMLInputElement>) => options.filterCallback(e, options.index)}
                numberOfInputs={numberOfInputs}
                inputType={InputTypes.Numeric}
                solidListViewMetaData={solidListViewMetaData}
                fieldMetadata={fieldMetadata}
                column={column}
            >
            </SolidVarInputsFilterElement>
        )
    };
    const filterMatchModeOptions = [
        { label: 'Equals', value: FilterMatchMode.EQUALS },
        { label: 'Not Equals', value: FilterMatchMode.NOT_EQUALS },
        { label: 'Less Than', value: FilterMatchMode.LESS_THAN },
        { label: 'Less Than Or Equal', value: FilterMatchMode.LESS_THAN_OR_EQUAL_TO },
        { label: 'Greater Than', value: FilterMatchMode.GREATER_THAN },
        { label: 'Greater Than Or Equal', value: FilterMatchMode.GREATER_THAN_OR_EQUAL_TO },
        { label: 'In', value: FilterMatchMode.IN },
        { label: 'Not In', value: FilterMatchMode.NOT_IN },
        { label: 'Between', value: FilterMatchMode.BETWEEN }
    ];

    const truncateAfter = solidListViewMetaData?.data?.solidView?.layout?.attrs?.truncateAfter
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
                let viewWidget = column.attrs.viewWidget;
                if (!viewWidget) {
                    viewWidget = 'DefaultTextListWidget';
                }
                let DynamicWidget = getExtensionComponent(viewWidget);
                const widgetProps: SolidListFieldWidgetProps = {
                    rowData,
                    solidListViewMetaData,
                    fieldMetadata,
                    column
                }
                return (
                    <>
                        {DynamicWidget && <DynamicWidget {...widgetProps} />}
                    </>
                )
            }
            }
        ></Column>
    );

};

export default SolidIntColumn;