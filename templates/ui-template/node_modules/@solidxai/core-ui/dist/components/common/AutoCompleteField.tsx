

import { AutoComplete } from "primereact/autocomplete";
import { useEffect, useState } from "react";
import { getVirtualScrollerOptions } from "../../helpers/autoCompleteVirtualScroll";



export const AutoCompleteField = ({ multiple, isFormFieldValid, formik, fieldName, searchData, existingData, existingDataTitle, existingDataId, onBlur }: any) => {




    const [selectedItem, setSelectedItem] = useState(existingData);
    const [filteredItem, setFilteredItem] = useState([]);
    useEffect(() => {
        if (existingData) {
            setSelectedItem(existingData)
            // formik.setFieldValue(fieldName, existingData);

        }
    }, [existingData])
    const searchItems = async (event: any) => {
        const data = await searchData(event);
        setFilteredItem(data);
    };


    return (

        <AutoComplete
            value={selectedItem}
            multiple={multiple ? multiple : false}
            suggestions={filteredItem}
            invalid={isFormFieldValid(formik, fieldName)}
            completeMethod={searchItems}
            // virtualScrollerOptions={{ itemSize: 38 }}
            virtualScrollerOptions={getVirtualScrollerOptions({
                itemsLength: filteredItem.length,
              })}
            className="solid-standard-autocomplete w-full"
            // style={{
            //     maxHeight: 39.67
            // }}
            field="label"
            dropdown
            onBlur={onBlur}
            onChange={(e) => {
                let data = {};

              
                if (typeof (e.value) == "string") {
                    data = e.value
                } else {
                    if (multiple === true) {
                        data = e.value.map((m: any) =>
                        ({
                            label: m.label,
                            name: m.label,
                            value: m.value,
                            id: m.value,
                        }))
                    } else {
                        data = {
                            label: e.value.label,
                            name: e.value.label,
                            value: e.value.value,
                            id: e.value.value,
                        }
                    }
                }


                setSelectedItem(data);
                formik.setFieldValue(fieldName, data);
            }}
        />
    )
}