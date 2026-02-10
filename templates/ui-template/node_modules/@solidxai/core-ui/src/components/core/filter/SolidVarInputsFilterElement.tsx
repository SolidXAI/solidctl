import { Calendar } from "primereact/calendar";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { useEffect, useState } from "react";
import { SolidManyToOneFilterElement } from "./SolidManyToOneFilterElement";
import { SolidSelectionDynamicFilterElement } from "./SolidSelectionDynamicFilterElement";
import { SolidSelectionStaticFilterElement } from "./SolidSelectionStaticFilterElement";
import { Button } from "primereact/button";
import { SolidManyToManyFilterElement } from "./SolidManyToManyFilterElement";
import { SolidBooleanFilterElement } from "./SolidBooleanFilterElement";

export enum InputTypes {
    Date = 'Date',
    DateTime = 'DateTime',
    Time = 'Time',
    Numeric = 'Numeric',
    Text = 'Text',
    SelectionStatic = 'SelectionStatic',
    RelationManyToOne = 'RelationManyToOne',
    RelationManyToMany = 'RelationManyToMany',
    SelectionDynamic = 'SelectionDynamic',
    Boolean = 'Boolean',
}


// Based on numberOfInputs map the input filed and hide add and delete 
export const SolidVarInputsFilterElement = ({ values, onChange, inputType = InputTypes.Text, numberOfInputs = null, fieldMetadata }: any) => {

    if (!values) {
        values = numberOfInputs && numberOfInputs > 0 ? Array(numberOfInputs).fill('') : [''];
        // values = [''];
    } else {
        if (values[0] == '') {
            values = numberOfInputs && numberOfInputs > 0 ? Array(numberOfInputs).fill('') : [''];
        } else {

            values = values
        }
    }



    // TODO: Ideally values will be an array, so we can spread them here instead of making a nested array.
    const [inputs, setInputs] = useState([...values]);
    useEffect(() => {
        setInputs([...values])
    }, [numberOfInputs])

    const updateInputs = (index: number, value: any) => {
        const updatedSpecification = inputs.map((item, i) =>
            i === index ? value : item
        );
        setInputs(updatedSpecification);
    };

    const addInput = () => {
        setInputs([...inputs, '']);
    };

    const deleteInput = (index: number) => {
        if (inputs.length > 1) {
            const updatedRows = inputs.filter((_, rowIndex) => rowIndex !== index);
            setInputs(updatedRows);

        } else {
        }
    };

    useEffect(() => {
        onChange(inputs)
    }, [inputs])



    return (
        <>
            {inputs && inputs.map((value: any, index: number) => (
                <div className="flex">
                    {numberOfInputs === 0 ?
                        <></>
                        :
                        <>
                            {inputType === InputTypes.Text &&
                                <InputText
                                    value={value}
                                    onChange={(e) => updateInputs(index, e.target.value)}
                                    placeholder=""
                                    className='w-full p-inputtext-sm'
                                />
                            }
                            {inputType === InputTypes.Numeric &&
                                <InputNumber
                                    value={value}
                                    onChange={(e) => updateInputs(index, e.value)}
                                    placeholder=""
                                    className='w-full p-inputtext-sm'
                                />
                            }
                            {inputType === InputTypes.Date &&
                                <Calendar
                                    value={value}
                                    onChange={(e) => updateInputs(index, e.target.value)}
                                    dateFormat="mm/dd/yy"
                                    placeholder="mm/dd/yyyy"
                                    mask="99/99/9999"
                                    className="w-full"
                                    inputClassName="w-full p-inputtext-sm"
                                />
                            }
                            {inputType === InputTypes.DateTime &&
                                <Calendar
                                    value={value}
                                    onChange={(e) => updateInputs(index, e.target.value)}
                                    dateFormat="mm/dd/yy"
                                    placeholder="mm/dd/yyyy hh:mm"
                                    mask="99/99/9999 99:99"
                                    showTime
                                    hourFormat="24"
                                    className="w-full"
                                    inputClassName="w-full p-inputtext-sm"
                                />
                            }
                            {inputType === InputTypes.Time &&
                                <Calendar
                                    value={value}
                                    onChange={(e) => updateInputs(index, e.target.value)}
                                    placeholder="hh:mm"
                                    mask="99:99"
                                    timeOnly
                                    hourFormat="24"
                                    className="w-full"
                                    inputClassName="w-full p-inputtext-sm"
                                />
                            }
                            {inputType === InputTypes.RelationManyToOne &&
                                <SolidManyToOneFilterElement
                                    value={value}
                                    index={index}
                                    updateInputs={updateInputs}
                                    fieldMetadata={fieldMetadata}
                                ></SolidManyToOneFilterElement>
                            }
                            {inputType === InputTypes.RelationManyToMany &&
                                <SolidManyToManyFilterElement
                                    value={value}
                                    index={index}
                                    updateInputs={updateInputs}
                                    fieldMetadata={fieldMetadata}
                                ></SolidManyToManyFilterElement>
                            }
                            {inputType === InputTypes.SelectionDynamic &&
                                <SolidSelectionDynamicFilterElement
                                    value={value}
                                    index={index}
                                    updateInputs={updateInputs}
                                    fieldMetadata={fieldMetadata}
                                ></SolidSelectionDynamicFilterElement>
                            }
                            {inputType === InputTypes.SelectionStatic &&

                                <SolidSelectionStaticFilterElement
                                    value={value}
                                    index={index}
                                    updateInputs={updateInputs}
                                    fieldMetadata={fieldMetadata}
                                ></SolidSelectionStaticFilterElement>
                            }
                            {inputType === InputTypes.Boolean &&

                                <SolidBooleanFilterElement
                                    value={value}
                                    index={index}
                                    updateInputs={updateInputs}
                                    fieldMetadata={fieldMetadata}
                                ></SolidBooleanFilterElement>
                            }


                            {numberOfInputs === null &&
                                <>
                                    {/* Plus Button to add a new row */}
                                    {/* < Button
                                    icon="pi pi-plus"
                                    size="small"
                                    className="small-button"
                                    onClick={addInput}
                                    type="button"
                                /> */}

                                    {/* Trash Button to delete the row */}
                                    {/* <Button
                                    icon="pi pi-trash"
                                    size="small"
                                    className="small-button"
                                    onClick={() => deleteInput(index)}
                                    severity="danger"
                                    type="button"
                                /> */}
                                    <Button text severity='secondary' icon="pi pi-plus" size='small' onClick={() => addInput()} className='solid-filter-action-btn' />
                                    <Button text severity='secondary' icon="pi pi-trash" size='small' onClick={() => deleteInput(index)} className='solid-filter-action-btn' />
                                </>
                            }
                        </>
                    }
                </div>
            ))}
        </>
    )
}