

import { createSolidEntityApi } from "../../../redux/api/solidEntityApi";
import { AutoComplete, AutoCompleteCompleteEvent } from "primereact/autocomplete";
import { useEffect, useState } from "react";
import qs from "qs";

export const SolidManyToManyFilterElement = ({
    value = [],
    updateInputs,
    index,
    fieldMetadata
}: any) => {

    const entityApi = createSolidEntityApi(fieldMetadata.relationCoModelSingularName);
    const { useLazyGetSolidEntitiesQuery } = entityApi;
    const [triggerGetSolidEntities] = useLazyGetSolidEntitiesQuery();

    const [suggestions, setSuggestions] = useState<any[]>([]);

    const search = async (event: AutoCompleteCompleteEvent) => {
        const queryData = {
            offset: 0,
            limit: 20,
            filters: {
                [fieldMetadata?.relationModel?.userKeyField?.name]: {
                    $containsi: event.query
                }
            }
        };

        const qsString = qs.stringify(queryData, { encodeValuesOnly: true });
        const response = await triggerGetSolidEntities(qsString);

        if (response.data) {
            setSuggestions(
                response.data.records.map((item: any) => ({
                    label: item[fieldMetadata.relationModel.userKeyField.name],
                    value: item.id
                }))
            );
        }
    };


    return (
        <AutoComplete
            // multiple
            dropdown
            field="label"
            value={value}
            suggestions={suggestions}
            completeMethod={search}
            onChange={(e) => {
                // const cleanValues = Array.isArray(e.value) ? e.value : [];
                // updateInputs(index, cleanValues);
                updateInputs(index, e.value)
            }}
            placeholder={`Select ${fieldMetadata.displayName}`}
            className="w-full"
            inputClassName="w-full p-inputtext-sm"
        />
    );
};