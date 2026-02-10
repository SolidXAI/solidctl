import { useState } from "react";
import qs from "qs";
import { createSolidEntityApi } from "../../../../../../../redux/api/solidEntityApi";

export const useRelationEntityHandler = ({ fieldContext, formik, autoCompleteLimit = 1000 }: any) => {
  const fieldMetadata = fieldContext.fieldMetadata;
  const fieldLayoutInfo = fieldContext.field;

  const entityApi = createSolidEntityApi(fieldMetadata.relationCoModelSingularName);
  const { useLazyGetSolidEntitiesQuery } = entityApi;
  const [triggerGetSolidEntities] = useLazyGetSolidEntitiesQuery();

  const [autoCompleteItems, setAutoCompleteItems] = useState([]);

  const fetchRelationEntities = async (autocompleteQs = "", limit = autoCompleteLimit) => {
    // const queryData = {
    //   offset: 0,
    //   limit: limit,
    //   filters: {
    //     [fieldMetadata?.relationModel?.userKeyField?.name]: {
    //       '$containsi': query
    //     }
    //   }
    // };

    // const autocompleteQs = qs.stringify(queryData, { encodeValuesOnly: true });

    const response = await triggerGetSolidEntities(autocompleteQs);
    const data = response.data;

    if (data) {
      const mappedItems = data.records.map((item: any) => ({
        label: item[fieldMetadata?.relationModel?.userKeyField?.name],
        value: item['id'],
        original: item
      }));
      setAutoCompleteItems(mappedItems);
    }
  };

  const addNewRelation = (values: any) => {
    const currentData = formik.values[fieldLayoutInfo.attrs.name] || [];
    const jsonValues = Object.fromEntries(values.entries());
    const newItem = {
      label: jsonValues[fieldMetadata?.relationModel?.userKeyField?.name],
      value: "new",
      original: jsonValues,
    };

    formik.setFieldValue(fieldLayoutInfo.attrs.name, [...currentData, newItem]);

    // Optionally add to autocomplete list
    setAutoCompleteItems((prev: any) => {
      const exists = prev.some((item: any) => item.label === newItem.label);
      return exists ? prev : [...prev, newItem];
    });
  };

  return {
    autoCompleteItems,
    fetchRelationEntities,
    addNewRelation
  };
};
