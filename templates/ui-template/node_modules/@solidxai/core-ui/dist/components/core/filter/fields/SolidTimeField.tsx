
import { Dropdown } from 'primereact/dropdown';
import { getNumberOfInputs, SolidFilterFieldsParams } from '../SolidFilterFields';
import { InputTypes, SolidVarInputsFilterElement } from '../SolidVarInputsFilterElement';
import { dateFilterMatchModeOptions } from './SolidDateField';

const SolidTimeField = ({ fieldMetadata, onChange, index, rule }: SolidFilterFieldsParams) => {
    // const filterable = column.attrs.filterable;
    const showFilterOperator = false;
    const columnDataType = 'date';

    // TODO: the body template to be controlled based on the format that one is expecting the date to be displayed in.
    // const header = column.attrs.label ?? fieldMetadata.displayName;
    const numberOfInputs = getNumberOfInputs(rule.matchMode);
    return (
        <div className='flex flex-column md:flex-row align-items-start gap-2 md:gap-0'>
            <div className="col-12 md:col-6 px-0 md:pr-2 md:pl-0">
                <Dropdown
                    value={rule.matchMode}
                    onChange={(e: any) => {
                        onChange(rule.id, 'matchMode', e.value)
                    }}
                    options={dateFilterMatchModeOptions}
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
                        onChange(rule.id, 'value', e)
                    }}
                    numberOfInputs={numberOfInputs}
                    inputType={InputTypes.Time}
                    fieldMetadata={fieldMetadata}
                >
                </SolidVarInputsFilterElement>
            </div>
        </div>
    );

};

export default SolidTimeField;