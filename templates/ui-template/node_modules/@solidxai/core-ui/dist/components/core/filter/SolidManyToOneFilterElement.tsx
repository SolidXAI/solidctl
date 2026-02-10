
import { createSolidEntityApi } from "../../../redux/api/solidEntityApi";
import { AutoComplete, AutoCompleteCompleteEvent } from "primereact/autocomplete";
import { useState } from "react";
import qs from "qs";


export const SolidManyToOneFilterElement = ({ value, updateInputs, index, fieldMetadata }: any) => {

    const entityApi = createSolidEntityApi(fieldMetadata.relationCoModelSingularName);
    const { useLazyGetSolidEntitiesQuery } = entityApi;
    const [triggerGetSolidEntities] = useLazyGetSolidEntitiesQuery();

    const [autoCompleteItems, setAutoCompleteItems] = useState([]);
    const autoCompleteSearch = async (event: AutoCompleteCompleteEvent) => {

        // Get the list view layout & metadata first. 
        const queryData = {
            offset: 0,
            limit: 10,
            filters: {
                [fieldMetadata?.relationModel?.userKeyField?.name]: {
                    $containsi: event.query
                }
            }
        };

        const autocompleteQs = qs.stringify(queryData, {
            encodeValuesOnly: true,
        });

        // TODO: do error handling here, possible errors like modelname is incorrect etc...
        const autocompleteResponse = await triggerGetSolidEntities(autocompleteQs);

        // TODO: if no data found then can we show no matching "entities", where entities can be replaced with the model plural name,
        const autocompleteData = autocompleteResponse.data;

        if (autocompleteData) {
            const autoCompleteItems = autocompleteData.records.map((item: any) => {
                return {
                    label: item[fieldMetadata?.relationModel?.userKeyField?.name],
                    value: item['id']
                }
            });
            setAutoCompleteItems(autoCompleteItems);
        }
    }

    return (
        <AutoComplete
            dropdown
            field="label"
            value={value}
            suggestions={autoCompleteItems}
            completeMethod={autoCompleteSearch}
            onChange={(e) => updateInputs(index, e.value)}
            className="w-full"
            inputClassName="w-full p-inputtext-sm"
        />
    )
}