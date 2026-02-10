
import { InputTypes, SolidVarInputsFilterElement } from '../../../../../components/core/filter/SolidVarInputsFilterElement';
import { Dropdown } from 'primereact/dropdown';
import { getNumberOfInputs, SolidFilterFieldsParams } from '../../../../../components/core/filter/SolidFilterFields';

const SolidRelationManyToOneField = ({ fieldMetadata, onChange, index, rule }: SolidFilterFieldsParams) => {
    // const filterable = column.attrs.filterable;
    const showFilterOperator = false;
    const filterMatchModeOptions = [
        { label: 'In', value: "$in" },
        { label: 'Not In', value: "$notIn" },
    ];
    const columnDataType = undefined;
    const numberOfInputs = getNumberOfInputs(rule.matchMode);

    // const filterTemplate = (options: ColumnFilterElementTemplateOptions) => {

    //     return (
    //         <SolidVarInputsFilterElement
    //             values={options.value}
    //             onChange={(e: FormEvent<HTMLInputElement>) => options.filterCallback(e, options.index)}
    //             inputType={InputTypes.RelationManyToOne}
    //             solidListViewMetaData={solidListViewMetaData}
    //             fieldMetadata={fieldMetadata}
    //             column={column}
    //         >
    //         </SolidVarInputsFilterElement>
    //     )
    // };

    // const bodyTemplate = (rowData: any) => {
    //     const manyToOneFieldData = rowData[column.attrs.name];

    //     // This is the userkey that will be present within the rowData.
    //     if (manyToOneFieldData) {
    //         // Since this is a many-to-one field, we fetch the user key field of the associated model.
    //         const userKeyField = fieldMetadata.relationModel.userKeyField.name;

    //         const manyToOneColVal = manyToOneFieldData[userKeyField];

    //         // TODO: change this to use an anchor tag so that on click we open that entity form view. 
    //         return <span>{manyToOneColVal}</span>;
    //     }
    //     else {
    //         return <span></span>
    //     }
    // };
    // const header = column.attrs.label ?? fieldMetadata.displayName;

    return (
        <div className='flex flex-column md:flex-row align-items-start gap-2 md:gap-0'>
            <div className="col-12 md:col-6 px-0 md:pr-2 md:pl-0">

            <Dropdown
                value={rule.matchMode}
                onChange={(e: any) => {
                    onChange(rule.id, 'matchMode', e.value)
                }}
                options={filterMatchModeOptions}
                optionLabel='label'
                optionValue='value'
                placeholder="Select Operator"
                className="p-inputtext-sm w-full"
            />
            </div>

            <div className='flex flex-column gap-2 col-12 md:col-6 px-0 md:pl-2 md:pr-0'>
                <SolidVarInputsFilterElement
                    values={rule.value}
                    onChange={(e: any) => {
                        onChange(index, 'value', e)
                    }}
                    numberOfInputs={numberOfInputs}
                    inputType={InputTypes.RelationManyToOne}
                    fieldMetadata={fieldMetadata}
                >
                </SolidVarInputsFilterElement>
            </div>
        </div>
    );

};

export default SolidRelationManyToOneField;