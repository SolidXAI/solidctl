
import React from 'react';
import { Column, ColumnFilterElementTemplateOptions } from "primereact/column";
import { InputTypes, SolidVarInputsFilterElement } from "../SolidVarInputsFilterElement";
import { SolidListViewColumnParams } from '../SolidListViewColumn';
import { FormEvent } from "primereact/ts-helpers";
import { FilterMatchMode } from 'primereact/api';
import SolidTableRowCell from '../SolidTableRowCell';
import { SolidListFieldWidgetProps } from '../../../../types/solid-core';
import { getExtensionComponent } from '../../../../helpers/registry';

const SolidExternalIdColumn = ({ solidListViewMetaData, fieldMetadata, column }: SolidListViewColumnParams) => {
    const filterable = column.attrs.filterable;
    const showFilterOperator = false;
    const columnDataType = 'text';
    const filterMatchModeOptions = [
        { label: 'In', value: FilterMatchMode.IN },
        { label: 'Not In', value: FilterMatchMode.NOT_IN },
    ];
    const filterTemplate = (options: ColumnFilterElementTemplateOptions) => {

        return (
            <SolidVarInputsFilterElement
                values={options.value}
                onChange={(e: FormEvent<HTMLInputElement>) => options.filterCallback(e, options.index)}
                inputType={InputTypes.Text}
                solidListViewMetaData={solidListViewMetaData}
                fieldMetadata={fieldMetadata}
                column={column}
            >
            </SolidVarInputsFilterElement>
        )
    }

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

export default SolidExternalIdColumn;
