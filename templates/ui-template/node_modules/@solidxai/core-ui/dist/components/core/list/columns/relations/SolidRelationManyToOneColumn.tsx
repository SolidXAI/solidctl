
import { FilterMatchMode } from 'primereact/api';
import { Column, ColumnFilterElementTemplateOptions } from "primereact/column";
import { FormEvent } from "primereact/ts-helpers";
import { SolidListViewColumnParams } from '../../../../../components/core/list/SolidListViewColumn';
import { InputTypes, SolidVarInputsFilterElement } from '../../../../../components/core/list/SolidVarInputsFilterElement';
import { getExtensionComponent } from '../../../../../helpers/registry';
import { SolidListFieldWidgetProps } from '../../../../../types/solid-core';
import { Button } from 'primereact/button';
import { useRouter } from "../../../../../hooks/useRouter";
import { kebabCase } from 'change-case';

const SolidRelationManyToOneColumn = ({ solidListViewMetaData, fieldMetadata, column }: SolidListViewColumnParams) => {
    const filterable = column.attrs.filterable;
    const showFilterOperator = false;
    const filterMatchModeOptions = [
        { label: 'In', value: FilterMatchMode.IN },
        { label: 'Not In', value: FilterMatchMode.NOT_IN },
    ];
    const columnDataType = undefined;



    const filterTemplate = (options: ColumnFilterElementTemplateOptions) => {

        return (
            <SolidVarInputsFilterElement
                values={options.value}
                onChange={(e: FormEvent<HTMLInputElement>) => options.filterCallback(e, options.index)}
                inputType={InputTypes.RelationManyToOne}
                solidListViewMetaData={solidListViewMetaData}
                fieldMetadata={fieldMetadata}
                column={column}
            >
            </SolidVarInputsFilterElement>
        )
    };

    const header = column.attrs.label ?? fieldMetadata.displayName;

    return (
        <Column
            key={fieldMetadata.name}
            field={fieldMetadata.name}
            header={header}
            // className="text-sm"
            sortable={column.attrs.sortable}
            // filter={filterable}
            dataType={columnDataType}
            showFilterOperator={showFilterOperator}
            filterMatchModeOptions={filterMatchModeOptions}
            filterElement={filterTemplate}
            body={(rowData) => {
                let viewWidget = column.attrs.viewWidget;
                if (!viewWidget) {
                    viewWidget = 'DefaultRelationManyToOneListWidget';
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
            filterPlaceholder={`Search by ${fieldMetadata.displayName}`}
            style={{ minWidth: "12rem" }}
            headerClassName="table-header-fs"
        ></Column>
    );

};

export default SolidRelationManyToOneColumn;


export const DefaultRelationManyToOneListWidget = ({ rowData, solidListViewMetaData, fieldMetadata, column }: SolidListFieldWidgetProps) => {
    const router = useRouter();
    const manyToOneFieldData = rowData[column.attrs.name];

    // This is the userkey that will be present within the rowData.
    if (manyToOneFieldData) {
        // Since this is a many-to-one field, we fetch the user key field of the associated model.
        const userKeyField = column?.attrs?.coModelFieldToDisplay ? column?.attrs?.coModelFieldToDisplay : fieldMetadata?.relationModel?.userKeyField?.name;

        const manyToOneColVal = manyToOneFieldData[userKeyField];

        return (
            <Button
                label={manyToOneColVal}
                link
                onClick={() => {
                    // Get current path from browser
                    const pathSegments = window.location.pathname.split('/').filter(Boolean);

                    // The modelName is the second-last segment before "list"
                    const listIndex = pathSegments.lastIndexOf('list');
                    if (listIndex > 0) {
                        pathSegments[listIndex - 1] = kebabCase(fieldMetadata?.relationModel?.singularName);
                        pathSegments[listIndex] = `form/${manyToOneFieldData?.id}`;
                    }
                    const newPath = `/${pathSegments.join('/')}?viewMode=view`;
                    router.push(newPath);
                }}
            />
        );
    }
    else {
        return <span></span>
    }
};
