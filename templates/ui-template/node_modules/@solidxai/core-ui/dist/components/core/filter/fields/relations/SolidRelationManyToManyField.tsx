

import { SolidFilterFieldsParams, getNumberOfInputs } from '../../../../../components/core/filter/SolidFilterFields';
import { SolidVarInputsFilterElement, InputTypes } from '../../../../../components/core/filter/SolidVarInputsFilterElement';
import { Dropdown } from 'primereact/dropdown';

const SolidRelationManyToManyField = ({
    fieldMetadata,
    onChange,
    index,
    rule,
}: SolidFilterFieldsParams) => {

    const filterMatchModeOptions = [
        { label: 'In', value: '$in' },
        { label: 'Not In', value: '$notIn' }
        // { label: 'Is Empty', value: '$null' },
        // { label: 'Is Not Empty', value: '$notNull' },
    ];

    const noInputOperators = ['$null', '$notNull'];
    const needsInput = !noInputOperators.includes(rule.matchMode);
    const numberOfInputs = needsInput ? getNumberOfInputs(rule.matchMode) : 0;

    return (
        <div className="flex flex-column md:flex-row align-items-start gap-2 md:gap-0">
            {/* Operator */}
            <div className="col-12 md:col-6 px-0 md:pr-2 md:pl-0">
                <Dropdown
                    value={rule.matchMode}
                    onChange={(e) => {
                        onChange(rule.id, 'matchMode', e.value);
                        // Clear value if switching to no-input operator
                        if (noInputOperators.includes(e.value)) {
                            onChange(rule.id, 'value', []);
                        }
                    }}
                    options={filterMatchModeOptions}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select Operator"
                    className="p-inputtext-sm w-full"
                />
            </div>

            {/* MultiSelect input */}
            <div className="flex flex-column gap-2 col-12 md:col-6 px-0 md:pl-2 md:pr-0">
                <SolidVarInputsFilterElement
                    values={rule.value}
                    onChange={(value: any) => {
                        onChange(index, 'value', value);
                    }}
                    numberOfInputs={numberOfInputs}
                    inputType={InputTypes.RelationManyToMany}
                    fieldMetadata={fieldMetadata}
                />
            </div>
        </div>
    );
};

export default SolidRelationManyToManyField;