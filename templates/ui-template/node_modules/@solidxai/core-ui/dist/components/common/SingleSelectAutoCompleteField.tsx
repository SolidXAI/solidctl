
import { AutoComplete } from "primereact/autocomplete";
import { useEffect, useState } from "react";
import { getVirtualScrollerOptions } from "../../helpers/autoCompleteVirtualScroll";



// UsesCases
// Suppose you have a moduelId field In create Dto then you need to creaate a module key in firmik and use that to store the autocomplete state and along with it update the moduleId  Field with id
// In case of relationType the Id field will always will be id   
// Else the value will be whatever valuekey use passed 

export const SingleSelectAutoCompleteField = ({ disabled, formik, isFormFieldValid, relationField, fieldName, fieldNameId, labelKey, valueKey, searchData, existingData, additionalAction, formErrors }: any) => {

    const [selectedItem, setSelectedItem] = useState(existingData);
    const [filteredItem, setFilteredItem] = useState([]);
    useEffect(() => {
        // if (existingData) {
        setSelectedItem(existingData)
        // formik.setFieldValue(fieldName, existingData);

        // }
    }, [existingData])
    const searchItems = async (event: any) => {
        const data = await searchData(event);
        setFilteredItem(data);

    };    


    return (
        <>
            <AutoComplete
                disabled={disabled ? disabled : false}
                value={selectedItem}
                suggestions={filteredItem}
                // invalid={(isFormFieldValid(formik, fieldName) || (formErrors[fieldName]))}
                invalid={isFormFieldValid(formik, fieldName)}

                completeMethod={searchItems}
                // virtualScrollerOptions={{ itemSize: 38 }}
                virtualScrollerOptions={getVirtualScrollerOptions({
                    itemsLength: filteredItem.length,
                  })}
                  
                // style={{
                //     maxHeight: 39.67
                // }}
                field={labelKey}
                dropdown
                onChange={(e) => {
                    // formik.handleChange(e)
                    setSelectedItem(e.value);
                    if (additionalAction) {
                        additionalAction(e);
                    }
                    if (relationField === true) {
                        formik.setFieldValue(fieldName, e.value);
                        formik.setFieldValue(fieldNameId, e.value.id);
                    } else {
                        formik.setFieldValue(fieldName, e.value[valueKey]);

                    }

                }}
                className="solid-standard-autocomplete"
            />

        </>


    )
}