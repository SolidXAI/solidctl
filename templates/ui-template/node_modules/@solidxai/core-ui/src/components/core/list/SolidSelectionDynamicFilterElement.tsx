
import { useLazyGetSelectionDynamicValuesQuery } from "../../../redux/api/fieldApi";
import { AutoComplete, AutoCompleteCompleteEvent } from "primereact/autocomplete";
import qs from "qs";
import { useState } from "react";


export const SolidSelectionDynamicFilterElement = ({ value, updateInputs, index, fieldMetadata }: any) => {


    // selection dynamic specific code. 
    const [triggerGetSelectionDynamicValues] = useLazyGetSelectionDynamicValuesQuery();
    const [selectionDynamicItems, setSelectionDynamicItems] = useState([]);
    const selectionDynamicSearch = async (event: AutoCompleteCompleteEvent) => {

        // Get the list view layout & metadata first. 
        const queryData = {
            offset: 0,
            limit: 10,
            query: event.query,
            id: fieldMetadata.id
        };

        const sdQs = qs.stringify(queryData, {
            encodeValuesOnly: true,
        });

        // TODO: do error handling here, possible errors like modelname is incorrect etc...
        const sdResponse = await triggerGetSelectionDynamicValues(sdQs);

        // TODO: if no data found then can we show no matching "entities", where entities can be replaced with the model plural name,
        const sdData = sdResponse.data.data;

        // @ts-ignore
        setSelectionDynamicItems(sdData);
    }


    return (

        <AutoComplete
            field="label"
            value={value}
            dropdown
            className="w-full solid-standard-autocomplete"
            suggestions={selectionDynamicItems}
            completeMethod={selectionDynamicSearch}
            onChange={(e) => updateInputs(index, e.value)} />
    )
}