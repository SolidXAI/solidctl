
import { Dropdown } from 'primereact/dropdown';
import { getNumberOfInputs, SolidFilterFieldsParams } from '../SolidFilterFields';
import { InputTypes, SolidVarInputsFilterElement } from '../SolidVarInputsFilterElement';

const SolidIntField = ({ fieldMetadata, onChange, index, rule }: SolidFilterFieldsParams) => {
    // const filterable = column.attrs.filterable;
    const filterMatchModeOptions = [
        { label: 'Equals', value: "$eq" },
        { label: 'Not Equals', value: "$ne" },
        { label: 'Less Than', value: "$lt" },
        { label: 'Less Than Or Equal', value: "$lte" },
        { label: 'Greater Than', value: "$gt" },
        { label: 'Greater Than Or Equal', value: "$gte" },
        { label: 'In', value: "$in" },
        { label: 'Not In', value: "$notIn" },
        { label: 'Between', value: "$between" },
        { label: 'Is null', value: "$null" },
        { label: 'Is Not null', value: "$notNull" }        
    ];



    // const header = column.attrs.label ?? fieldMetadata.displayName;
    const numberOfInputs = getNumberOfInputs(rule.matchMode);

    return (
        <div className='flex flex-column md:flex-row align-items-start gap-2 md:gap-0'>
            <div className="col-12 md:col-6 px-0 md:pr-2 md:pl-0">
                <Dropdown
                    value={rule.matchMode}
                    onChange={(e: any) => {
                        // updateEnumValues(index, 'operator', e.value)
                        onChange(rule.id, 'matchMode', e.value)
                    }}
                    options={filterMatchModeOptions}
                    optionLabel='label'
                    optionValue='value'
                    placeholder="Select Operator"
                    className="p-inputtext-sm w-full "
                />
            </div>

            <div className='flex flex-column gap-2 col-12 md:col-6 px-0 md:pl-2 md:pr-0'>
                <SolidVarInputsFilterElement
                    values={rule.value}
                    onChange={(e: any) => {
                        // updateEnumValues(index, 'value', e)
                        onChange(rule.id, 'value', e)
                    }}
                    numberOfInputs={numberOfInputs}
                    inputType={InputTypes.Numeric}
                    fieldMetadata={fieldMetadata}
                >
                </SolidVarInputsFilterElement>
            </div>
        </div>
    );
};

export default SolidIntField;