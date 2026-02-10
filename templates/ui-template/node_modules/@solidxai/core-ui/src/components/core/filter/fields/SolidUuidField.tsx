
import { Dropdown } from 'primereact/dropdown';
import { getNumberOfInputs, SolidFilterFieldsParams } from '../SolidFilterFields';
import { InputTypes, SolidVarInputsFilterElement } from '../SolidVarInputsFilterElement';

const SolidUuidField = ({ fieldMetadata, onChange, index, rule }: SolidFilterFieldsParams) => {
    const showFilterOperator = false;
    const columnDataType = 'text';
    const filterMatchModeOptions = [
        { label: 'In', value: "$in" },
        { label: 'Not In', value: "$notIn" },
        { label: 'Is null', value: "$null" },
        { label: 'Is Not null', value: "$notNull" }

    ];
    const numberOfInputs = getNumberOfInputs(rule.matchMode);

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
                    className="w-full p-inputtext-sm col-12 md:col-6"
                />
            </div>

            <div className='flex flex-column gap-2 col-12 md:col-6 px-0 md:pl-2 md:pr-0'>
                <SolidVarInputsFilterElement
                    values={rule.value}
                    onChange={(e: any) => {
                        onChange(rule.id, 'value', e)
                    }}
                    numberOfInputs={numberOfInputs}
                    inputType={InputTypes.Text}
                    fieldMetadata={fieldMetadata}
                >
                </SolidVarInputsFilterElement>
            </div>
        </div>
    );

};

export default SolidUuidField;