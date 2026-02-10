import { AutoComplete, AutoCompleteCompleteEvent } from "primereact/autocomplete";
import { useState } from "react";


export const SolidBooleanFilterElement = ({ value, updateInputs, index, fieldMetadata }: any) => {

    // selection dynamic specific code. 
    const [selectionStaticItems, setSelectionStaticItems] = useState<any>([]);
    const selectionStaticSearch = (event: AutoCompleteCompleteEvent) => {
        const selectionStaticData = [
            { label: 'true', value: "true" },
            { label: 'false', value: "false" }
        ]
        const suggestionData = selectionStaticData.filter((t: any) => t.value.startsWith(event.query.toLowerCase()));
        setSelectionStaticItems(suggestionData)
    }

    return (
        <AutoComplete
            field="label"
            value={value}
            dropdown
            suggestions={selectionStaticItems}
            completeMethod={selectionStaticSearch}
            onChange={(e) => updateInputs(index, e.value)}
            className="w-full"
            inputClassName="w-full p-inputtext-sm"
        />
    )
}