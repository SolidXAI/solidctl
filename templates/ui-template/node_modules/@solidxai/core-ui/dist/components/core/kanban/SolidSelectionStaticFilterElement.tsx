
import { AutoComplete, AutoCompleteCompleteEvent } from "primereact/autocomplete";
import { useState } from "react";


export const SolidSelectionStaticFilterElement = ({ value, updateInputs, index, fieldMetadata }: any) => {

    // selection dynamic specific code. 
    const [selectionStaticItems, setSelectionStaticItems] = useState([]);
    const selectionStaticSearch = (event: AutoCompleteCompleteEvent) => {
        const selectionStaticData = fieldMetadata.selectionStaticValues.map((i: string) => {
            return {
                label: i.split(":")[1],
                value: i.split(":")[0]
            }
        });
        const suggestionData = selectionStaticData.filter((t: any) => t.value.toLowerCase().startsWith(event.query.toLowerCase()));
        setSelectionStaticItems(suggestionData)
    }

    return (

        <AutoComplete
            field="label"
            value={value}
            dropdown
            className="w-full solid-standard-autocomplete"
            suggestions={selectionStaticItems}
            completeMethod={selectionStaticSearch}
            onChange={(e) => updateInputs(index, e.value)} />
    )
}