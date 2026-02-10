import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Dialog } from "primereact/dialog";
import FilterComponent, { FilterOperator, FilterRule, FilterRuleType } from "../../../components/core/common/FilterComponent";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import { usePathname } from "../../../hooks/usePathname";
import { useRouter } from "../../../hooks/useRouter";
import { useSearchParams } from "../../../hooks/useSearchParams";
import { queryStringToQueryObject } from "../list/SolidListView";
import { InputText } from "primereact/inputtext";
import { createSolidEntityApi } from "../../../redux/api/solidEntityApi";
import qs from "qs";
import { SolidSaveCustomFilterForm } from "./SolidSaveCustomFilterForm";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import { hydrateRelationRules } from "../../../helpers/hydrateRelationRules";
import { useSession } from '../../../hooks/useSession'

const getRandomInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface PredefinedSearch {
    name: string;
    description?: string;
    filters: Record<string, any>;
}

const extractFields = (nodes: any[] = []): any[] => {
    const result: any[] = [];

    for (const node of nodes) {
        if (node?.type === "field") {
            result.push(node);
        }

        if (Array.isArray(node?.children)) {
            result.push(...extractFields(node.children));
        }
    }

    return result;
};


const transformFiltersToRules = (filter: any, parentRule: number | null = null): FilterRule => {
    if (!filter || typeof filter !== "object" || Object.keys(filter).length === 0) {
        throw new Error("Invalid filter: expected a non-null object with properties");
    }
    if (!filter || typeof filter !== "object") {
        throw new Error("Invalid filter: expected a non-null object");
    }
    const currentId = idCounter++;
    if (filter["$or"]) {
        return {
            id: currentId,
            type: FilterRuleType.RULE_GROUP,
            matchOperator: FilterOperator.OR,
            parentRule,
            children: filter["$or"]
                .filter((sub: any) => {
                    // Filter out null, undefined, empty strings, and empty objects
                    if (sub == null) return false;
                    if (typeof sub === "string" && sub.trim() === "") return false;
                    if (typeof sub === "object" && Object.keys(sub).length === 0) return false;
                    return true;
                })
                .map((subFilter: any) => transformFiltersToRules(subFilter, currentId))
        };
    }

    if (filter["$and"]) {
        return {
            id: currentId,
            type: FilterRuleType.RULE_GROUP,
            matchOperator: FilterOperator.AND,
            parentRule,
            children: filter["$and"]
                .filter((sub: any) => {
                    // Filter out null, undefined, empty strings, and empty objects
                    if (sub == null) return false;
                    if (typeof sub === "string" && sub.trim() === "") return false;
                    if (typeof sub === "object" && Object.keys(sub).length === 0) return false;
                    return true;
                })
                .map((subFilter: any) => transformFiltersToRules(subFilter, currentId))
        };
    }

    // Handle single rule condition
    for (const fieldName in filter) {
        const condition = filter[fieldName];
        if (!condition || typeof condition !== "object") {
            throw new Error(`Invalid condition for field '${fieldName}'`);
        }

        // CASE 1: relation filter → unwrap first
        if (condition?.id && typeof condition?.id === "object") {
            for (const matchMode in condition.id) {
                const rawValue = condition.id[matchMode];
                const mathcModeValue: any = matchMode
                return {
                    id: currentId,
                    type: FilterRuleType.RULE,
                    fieldName,
                    matchMode: mathcModeValue,
                    value: Array.isArray(rawValue) ? rawValue : [rawValue],
                    parentRule,
                    children: []
                };
            }
        }

        // CASE 2: normal field → loop stays
        for (const matchMode in condition) {
            const rawValue = condition[matchMode];
            const mathcModeValue: any = matchMode
            return {
                id: currentId,
                type: FilterRuleType.RULE,
                fieldName,
                matchMode: mathcModeValue,
                value: Array.isArray(rawValue) ? rawValue : [rawValue],
                parentRule,
                children: []
            };
        }


    }
    throw new Error(ERROR_MESSAGES.INVALID_FILTER_STRUCTURE);
}




let idCounter = 1;
const generateId = () => Date.now() + Math.floor(Math.random() * 1000);


const transformRulesToFilters = (input: any, viewData: any) => {

    // Helper function to process individual rules
    const processRule = (rule: any) => {
        if (rule.value !== undefined && rule.value !== null) {

            // Ensure rule.value is always an array
            let values = typeof rule.value[0] === "object" ? rule.value.map((i: any) => i?.value ? i?.value : i) : rule?.value;
            if (rule.matchMode !== '$in' && rule.matchMode !== '$notIn' && rule.matchMode !== '$between' && rule.matchMode !== '$null' && rule.matchMode !== '$notNull') {
                values = values[0];
            }


            const fieldMeta = viewData?.data?.solidFieldsMetadata?.[rule.fieldName];
            const isManyToMany = fieldMeta?.type === 'relation' && fieldMeta?.relationType === 'many-to-many';


            let transformedRule;
            if (isManyToMany) {
                // For many-to-many relations, always use array format for $in/$notIn
                transformedRule = {
                    [rule.fieldName]: {
                        id: {
                            [rule.matchMode]: values // Keep as array
                        }
                    }
                };
            } else {
                // Rule transformation
                transformedRule = {
                    [rule.fieldName]: {
                        [rule.matchMode]: values    // Assuming `value` is always an array with `value` and `label`
                    }
                };
            }

            let processedFields;
            if (rule.children && rule.children.length > 0) {
                processedFields = rule.children.map((child: any) => processRuleGroup(child)).filter((child: any) => child != null);;
            }
            if (processedFields) {
                return { ...transformedRule, processedFields }
            }
            return { ...transformedRule }

        }

    };

    // Helper function to process rule groups
    const processRuleGroup = (ruleGroup: any) => {
        const operator = ruleGroup.matchOperator === 'or' ? '$or' : '$and';
        const children = ruleGroup.children.map((child: any) => {
            if (child.type === 'rule') {
                // Process the rule
                return processRule(child);
            } else if (child.type === 'rule_group') {
                // Process the rule group recursively
                return processRuleGroup(child);
            }
        }).filter((child: any) => child != null);
        // If no valid children, return null
        // if (children.length === 0) {
        //     return null;
        // }

        // If only one child, return it directly without wrapping in operator
        // if (children.length === 1) {
        //     return children[0];
        // }

        return {
            [operator]: children
        };
    };


    // Start processing the root rule group
    const filterObject = processRuleGroup(input);

    if (!filterObject) {
        return {};
    }

    function liftProcessedFields(filters: any) {
        if (!filters || typeof filters !== 'object') return filters;

        const processArray = (arr: any) => {
            let newArr = [];
            for (let obj of arr) {
                if (obj && obj.processedFields) {
                    let processed: any = processArray(obj.processedFields); // Recursively process nested processedFields
                    delete obj.processedFields;
                    newArr.push(obj, ...processed);
                } else {
                    newArr.push(obj);
                }

                for (let key in obj) {
                    if (Array.isArray(obj[key])) {
                        obj[key] = processArray(obj[key]);
                    }
                }
            }
            return newArr;
        }

        for (let key in filters) {
            if (Array.isArray(filters[key])) {
                filters[key] = processArray(filters[key]);
            }
        }

        return filters;
    }


    return liftProcessedFields(filterObject)

}


type GroupedType = {
    values: string[];
    searchField: any;
    matchMode: string;
}

// Build nested condition for relation fields
function buildNestedCondition(path: string, operatorKey: string, value: any) {
    const keys = path.split(".").filter(Boolean);
    const leaf = { [operatorKey]: value };
    return keys.reduceRight((acc, key) => ({ [key]: acc }), leaf);
}

const tranformSearchToFilters = (input: any) => {
    if (!input || !input.$and) return input;

    const grouped: Record<string, GroupedType> = {};

    input.$and.forEach(({ fieldName, value, searchField, matchMode }: any) => {
        const val = Array.isArray(value) && value.length === 1 ? value[0] : value;

        if (!grouped[fieldName]) {
            grouped[fieldName] = { values: [], searchField: searchField || "", matchMode: matchMode || "$containsi" };
        }

        if (Array.isArray(val)) {
            grouped[fieldName]?.values.push(...val);
        } else {
            grouped[fieldName]?.values.push(val);
        }
    });

    // return {
    //     $and: Object.entries(grouped).map(([fieldName, values]) => ({
    //         [fieldName]: {
    //             $containsi: values.length === 1 ? values[0] : values
    //         }
    //     }))
    // };

    const andFilters: any[] = [];

    Object.entries(grouped).forEach(([fieldName, value]) => {

        const isNested = value.searchField ? value.searchField.includes(".") : false;

        if (isNested) {

            // NESTED: use $eq and expand dot-notation into nested objects
            if (value.values.length === 1) {
                andFilters.push(buildNestedCondition(value.searchField, value.matchMode, value.values[0]));
            } else {
                andFilters.push({
                    $or: value.values.map(v => buildNestedCondition(value.searchField, value.matchMode, v)),
                });
            }
        } else {

            if (value.values.length === 1) {
                andFilters.push({
                    [fieldName]: {
                        $containsi: value.values[0]
                    }
                });
            } else {
                andFilters.push({
                    $or: value.values.map((v) => ({
                        [fieldName]: { $containsi: v }
                    }))
                });
            }
        }
    });

    return {
        $and: andFilters
    };
}

export const mergeSearchAndCustomFilters = (transformedFilter: any, newFilter: any, transformedFilterName: string, newFilterName: string) => {
    const filters: any = {};

    // Add only non-null filters
    if (transformedFilter && Object.keys(transformedFilter).length > 0) {
        filters[transformedFilterName] = transformedFilter;
    }
    if (newFilter && Object.keys(newFilter).length > 0) {
        filters[newFilterName] = newFilter;
    }

    // Return the combined filters object
    return filters;
}


export const mergeAllDiffFilters = (customFilter: any, searchFilter: any, savedFilter: any, preDefinedFilter?: any) => {
    const filters: any = {};

    // Add only non-null filters
    if (customFilter && Object.keys(customFilter).length > 0) {
        filters["custom_filter_predicate"] = customFilter;
    }
    if (searchFilter && Object.keys(searchFilter).length > 0) {
        filters["search_predicate"] = searchFilter;
    }
    if (savedFilter && Object.keys(savedFilter).length > 0) {
        filters["saved_filter_predicate"] = savedFilter;
    }
    if (preDefinedFilter && Object.keys(preDefinedFilter).length > 0) {
        filters["predefined_search_predicate"] = preDefinedFilter;
    }
    // Return the combined filters object
    return filters;
}

const SavedFilterList = ({ savedfilter, activeSavedFilter, applySavedFilter, openSavedCustomFilter, setSavedFilterTobeDeleted, setIsDeleteSQDialogVisible }: any) => {
    return (
        <div className="flex align-items-center justify-content-between gap-2">
            <div>
                <Button text size="small" className="text-base py-1 w-full" severity={Number(activeSavedFilter) == savedfilter.id ? "secondary" : "contrast"} onClick={() => applySavedFilter(savedfilter)}>{savedfilter.name}</Button>
                {savedfilter?.description && <p className="text-xs pl-3">{savedfilter?.description}</p>}
            </div>
            <div className="flex align-items-center gap-2">
                <Button
                    icon="pi pi-pencil"
                    style={{ fontSize: 10 }}
                    severity="secondary"
                    outlined size="small"
                    onClick={() => openSavedCustomFilter(savedfilter)}
                />
                <Button
                    icon="pi pi-trash"
                    style={{ fontSize: 10 }}
                    severity="secondary"
                    outlined size="small"
                    onClick={() => {
                        setSavedFilterTobeDeleted(savedfilter.id),
                            setIsDeleteSQDialogVisible(true);

                    }}
                />
            </div>
        </div>
    )
}

const replacePlaceholders = (obj: any, searchValue: string): any => {
    if (typeof obj === 'string') {
        return obj.replace(/\{\{search\}\}/g, searchValue);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => replacePlaceholders(item, searchValue));
    }
    if (obj && typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
            newObj[key] = replacePlaceholders(obj[key], searchValue);
        }
        return newObj;
    }
    return obj;
};

type RelationCache = Map<string, { label: string; value: number }>;



export const SolidGlobalSearchElement = forwardRef(({ viewData, handleApplyCustomFilter, filters, clearFilter, showSaveFilterPopup, setShowSaveFilterPopup }: any, ref) => {
    const defaultState: FilterRule[] = [
        {
            id: 1,
            type: FilterRuleType.RULE_GROUP,
            matchOperator: FilterOperator.OR,
            parentRule: null,
            children: [
                {
                    id: Date.now() + getRandomInt(1, 500),
                    type: FilterRuleType.RULE,
                    fieldName: null,
                    matchMode: null,
                    value: null,
                    parentRule: 1,
                    children: []
                },
                {
                    id: Date.now() + getRandomInt(1, 500),
                    type: FilterRuleType.RULE,
                    fieldName: null,
                    matchMode: null,
                    value: null,
                    parentRule: 1,
                    children: []
                }
            ]
        }
    ];
    const [initialState, setInitialState] = useState(defaultState);
    const pathname = usePathname();


    const searchParams = useSearchParams() // Converts the query params to a string
    const activeSavedFilter = searchParams?.get("savedQuery");

    const router = useRouter();

    const chipsRef = useRef<HTMLDivElement | null | any>(null);

    // filterRules is used to maintian the ui of custom filter 
    // customFilter is used to maintian the transformed filter object of custom filter
    const [filterRules, setFilterRules] = useState<FilterRule[]>(initialState);
    const [customFilter, setCustomFilter] = useState<any | null>(null);

    const [fields, setFields] = useState<any[]>([]);
    const [searchableFields, setSearchableFields] = useState<any[]>([]);

    // used to show the list of predefined searches 
    const [predefinedSearches, setPredefinedSearches] = useState<PredefinedSearch[]>([]);

    // used to open / close the custom fitler popup 
    const [showGlobalSearchElement, setShowGlobalSearchElement] = useState<boolean>(false);

    // searchChips maintain the ui to display searched query 
    // searchFilter maintain the transformed filter of the  searched query 
    const [searchChips, setSearchChips] = useState<{ columnName?: string; value: string }[]>([]);
    const [searchFilter, setSearchFilter] = useState<any | null>(null);

    // predefinedSearchChip maintain the ui to display predefined searches query 
    const [predefinedSearchChip, setPredefinedSearchChip] = useState<{ name: string; value: string } | null>(null);

    //  state to maintain the text typed in the search input box
    const [inputValue, setInputValue] = useState<string | null>("");

    // flag to prevent un necessary re renders
    const [hasSearched, setHasSearched] = useState<boolean>(false);

    // currentSavedFilterData  is used to save the whole object of saved filter 
    const [currentSavedFilterData, setCurrentSavedFilterData] = useState<any>();
    const [currentSavedFilterQuery, setCurrentSavedFilterQuery] = useState<any>();
    const [currentSavedFilterRules, setCurrentSavedFilterRules] = useState<any>();
    const [showSavedFilterComponent, setShowSavedFilterComponent] = useState<boolean>(false);


    const [savedFilterTobeDeleted, setSavedFilterTobeDeleted] = useState<any>();
    const [isDeleteSQDialogVisible, setIsDeleteSQDialogVisible] = useState<boolean>(false);
    const [savedFilterQueryString, setSavedFilterQueryString] = useState<string>();
    const [showOverlay, setShowOverlay] = useState(false);
    const overlayRef = useRef<HTMLDivElement | null>(null);

    const { data: session, status } = useSession();
    const user = session?.user;

    const [refreshKey, setRefreshKey] = useState(0);

    const [predefinedSearchBaseFilter, setPredefinedSearchBaseFilter] = useState<any>(null);

    const [savedFilters, setSavedFilters] = useState([]);
    const [savedFiltersLoaded, setSavedFiltersLoaded] = useState(false);

    const entityApi = createSolidEntityApi("savedFilters");
    const {
        useCreateSolidEntityMutation,
        useDeleteSolidEntityMutation,
        useGetSolidEntityByIdQuery,
        useUpdateSolidEntityMutation,
        useLazyGetSolidEntitiesQuery
    } = entityApi;

    const [
        createEntity,
        { isSuccess: isEntityCreateSuccess, isError: isEntityCreateError, error: entityCreateError },
    ] = useCreateSolidEntityMutation();

    const [
        updateEntity,
        { isSuccess: isEntityUpdateSuceess, isError: isEntityUpdateError, error: entityUpdateError },
    ] = useUpdateSolidEntityMutation();

    const [
        deleteEntity,
        { isSuccess: isEntityDeleteSuceess, isError: isEntityDeleteError, error: entityDeleteError },
    ] = useDeleteSolidEntityMutation();

    const [triggerGetSolidEntities, { data: solidEntityListViewData, isLoading: isSavedFilterLoading, error }] = useLazyGetSolidEntitiesQuery();

    const [savedFilterFetchDataRefreshKey, setSavedFilterFetchDataRefreshKey] = useState(0);

    useEffect(() => {
        const fn = async () => {
            if (!viewData?.data?.solidView?.model?.id || !viewData?.data?.solidView?.id || !user?.id) {
                return;
            }
            setSavedFiltersLoaded(false)
            const filters = {
                $or: [
                    {
                        $and: [
                            { model: { $in: [viewData?.data?.solidView?.model?.id] } },
                            { view: { $in: [viewData?.solidView?.id] } },
                            { user: { $in: [user?.id] } },
                            { isPrivate: { $eq: true } }
                        ]
                    },
                    {
                        $and: [
                            { model: { $in: [viewData?.data?.solidView?.model?.id] } },
                            { view: { $in: [viewData?.solidView?.id] } },
                            { isPrivate: { $eq: false } }
                        ]
                    }

                ]
            }
            const queryData: any = {
                offset: 0,
                limit: 10,
                filters: filters,
                populate: ["model", "view", "user"],
                sort: ["id:desc"],
            };
            const queryString = qs.stringify(queryData, { encodeValuesOnly: true });
            setSavedFilterQueryString(queryString)
            const savedFilter = await triggerGetSolidEntities(queryString).unwrap();

            if (savedFilter) {
                console.log("savedFilter", savedFilter);
                setSavedFilters(savedFilter?.records)
                setSavedFiltersLoaded(true);
            }
        }
        fn()
    }, [
        activeSavedFilter,
        savedFilterFetchDataRefreshKey,
        viewData?.data?.solidView?.id,
        viewData?.data?.solidView?.model?.id,
        user?.id
    ])

    useImperativeHandle(ref, () => ({
        clearFilter: () => {
            setFilterRules(initialState);
        }
    }));

    useEffect(() => {
        const fn = async () => {
            let searchChips: any;
            let customChips: any;
            let parsedSearchParams = searchParams;
            if (savedFiltersLoaded) {

                if (activeSavedFilter && savedFilters.length === 0) return;

                const queryObject = queryStringToQueryObject();
                // const savedQuery = parsedSearchParams?.get("savedQuery");
                if (activeSavedFilter) {
                    const currentSavedFilterId = Number(activeSavedFilter);
                    const currentSavedFilterData: any = savedFilters.find((savedFilter: any) => savedFilter.id === currentSavedFilterId);
                    setCurrentSavedFilterData(currentSavedFilterData);
                    if (currentSavedFilterData) {
                        const filterJson = JSON.parse(currentSavedFilterData?.filterQueryJson);
                        if (filterJson) {
                            let finalSavedFilter = filterJson
                            setCurrentSavedFilterQuery(finalSavedFilter)
                        }
                    }
                } else {
                    setCurrentSavedFilterData(null)
                    setCurrentSavedFilterQuery(null)
                }
                if (queryObject) {
                    if (queryObject) {
                        searchChips = queryObject?.search_predicate || null;
                        customChips = queryObject?.custom_filter_predicate || null;
                    }
                }
                if (searchChips) {
                    const formattedChips = searchChips?.$and.map((chip: any, key: any) => {
                        const chipKey = Object.keys(chip)[0]; // Get the key, e.g., "displayName"
                        const chipValue = chip[chipKey]?.$containsi; // Get the value of "$containsi"
                        const chipdata = {
                            columnName: chipKey,
                            value: chipValue
                        };
                        return chipdata
                    }
                    );
                    setSearchChips(formattedChips);
                    setSearchFilter(searchChips);

                }

                if (customChips && Object.keys(customChips).length !== 0) {
                    setCustomFilter(customChips);
                    const rules: FilterRule = transformFiltersToRules(customChips);
                    const hydratedRules = await hydrateRelationRules([rules], viewData);
                    setFilterRules(hydratedRules);
                }

                setHasSearched(true);
                setRefreshKey((prev) => prev + 1)
            }
        }
        fn()
    }, [viewData, activeSavedFilter, savedFilters, savedFiltersLoaded])




    useEffect(() => {
        if (viewData?.data?.solidFieldsMetadata) {
            // Reset search state when switching views
            setSearchChips([]);
            setSearchFilter(null);
            setFilterRules(initialState);
            setCustomFilter(null);
            setPredefinedSearchChip(null);
            setPredefinedSearchBaseFilter(null);
            setInputValue("");

            let fieldsData = viewData?.data?.solidFieldsMetadata;
            // console.log(`fiels data while rendering solid global search element: `);
            // console.log(fieldsData);

            const layoutChildren = viewData?.data?.solidView?.layout?.children ?? [];
            const fieldElements = extractFields(layoutChildren);


            const fieldsList = Object.entries(fieldsData ?? {}).map(([key, value]: any) => {
                const viewFieldElement = fieldElements.find(
                    (f: any) => f?.attrs?.name === key
                );
                return {
                    name: value.displayName,
                    value: key,
                    type: value.type,
                    ormType: value.ormType,
                    matchMode: viewFieldElement?.attrs?.searchMatchMode,
                    searchField: viewFieldElement?.attrs?.searchField ?? null,
                    isSearchable: viewFieldElement?.attrs?.isSearchable ?? false,
                };
            });

            setFields(fieldsList);

            const searchableFieldsList = fieldsList.filter((field: any) => {
                if (!field.isSearchable) return false;

                switch (field.type) {
                    case "relation":
                        // Only include relation if searchField is present
                        return !!field.searchField;
                    case "longText":
                    case "shortText":
                    case "selectionStatic":
                    case "selectionDynamic":
                        return true;
                    // case "selectionStatic":
                    case "computed":
                        return field.ormType === "varchar";
                    default:
                        return false;
                }
            });

            // console.log("searchableFieldsList", searchableFieldsList);


            // Optionally map to a minimal structure if needed for UI
            let finalSearchableFieldsList: any = searchableFieldsList.map((field: any) => ({
                fieldName: field.value,
                displayName: field.name,
                searchField: field.searchField ?? "",
                matchMode: field.matchMode
            }));

            // console.log("finalSearchableFieldsList", finalSearchableFieldsList);

            setSearchableFields(finalSearchableFieldsList);

            const predefinedSearchesList = viewData?.data?.solidView?.layout?.attrs?.predefinedSearches || [];
            setPredefinedSearches(predefinedSearchesList);
        }
        // used to open the 
    }, [viewData])

    useEffect(() => {
        if (chipsRef.current) {
            const inputElement = chipsRef.current.querySelector("input");
            if (inputElement) {
                inputElement.addEventListener("input", (e: any) => {
                    setInputValue((e.target as HTMLInputElement).value);
                });
            }
        }
    }, []);


    const handleAddChip = (columnName?: string) => {
        if (inputValue?.trim()) {
            const fallbackField = searchableFields[0]; // guaranteed object
            if (!fallbackField) return;
            // Support comma-separated values: split, trim and add as separate chips
            const values = inputValue.split(",").map(v => v.trim()).filter(v => v !== "");
            const fieldName = columnName || fallbackField.fieldName;
            const chipsToAdd = values.map(v => ({
                columnName: fieldName,
                value: v,
                columnDisplayName: fallbackField.displayName,
                searchField: fallbackField.searchField,
                matchMode: fallbackField.matchMode
            }));

            setSearchChips((prev) => [...prev, ...chipsToAdd]);
            setInputValue("");
            setHasSearched(true)
            setRefreshKey((prev) => prev + 1)

        }

    };

    const clearCustomFilter = () => {
        // handleApplyCustomFilter(finalFilter)
        setFilterRules(initialState);
        setCustomFilter(null)
        // setPredefinedSearchChip(null)
        // setPredefinedSearchBaseFilter(null)
        setHasSearched(true)
        setRefreshKey((prev) => prev + 1)

    }


    const transformCustomFilterRules = (filterRules: any) => {
        const transformedFilter = transformRulesToFilters(filterRules[0], viewData);
        // If there's a predefined search, merge it with the new custom filter
        let finalCustomFilter = transformedFilter;
        // if (predefinedSearchChip && predefinedSearchBaseFilter) {
        //     // Combine predefined filter with new custom filter
        //     finalCustomFilter = {
        //         $and: [predefinedSearchBaseFilter, transformedFilter]
        //     };
        // }
        setCustomFilter(finalCustomFilter);
        // handleApplyCustomFilter(finalFilter);
        setShowGlobalSearchElement(false);
        setHasSearched(true)
        setRefreshKey((prev) => prev + 1)
    }

    const transformSavedFilterRules = (filterRules: any) => {
        const transformedFilter = transformRulesToFilters(filterRules[0], viewData);

        // If there's a predefined search, merge it with the new custom filter
        let finalCustomFilter = transformedFilter;
        // if (predefinedSearchChip && predefinedSearchBaseFilter) {
        //     // Combine predefined filter with new custom filter
        //     finalCustomFilter = {
        //         $and: [predefinedSearchBaseFilter, transformedFilter]
        //     };
        // }
        setCurrentSavedFilterQuery(finalCustomFilter);
        // handleApplyCustomFilter(finalFilter);
        setShowSavedFilterComponent(false);
        setHasSearched(true)
        setRefreshKey((prev) => prev + 1)


    }

    useEffect(() => {
        if (refreshKey > 0) {
            console.log("refres", refreshKey);
            console.log("hasSearched", hasSearched);

            const formattedChips = {
                $and: searchChips.map((chip: any) => ({
                    fieldName: chip.columnName,
                    matchMode: chip.matchMode,
                    value: [chip.value],
                    searchField: chip.searchField ?? "",
                }))
            };


            const finalSearchFilter = tranformSearchToFilters(formattedChips);
            setSearchFilter(finalSearchFilter);

            let finalSavedFilter: any = currentSavedFilterQuery
            const finalPredefinedFilter = predefinedSearchBaseFilter

            const finalCustomFilter = customFilter

            console.log("finalCustomFilter", finalCustomFilter);
            console.log("finalPredefinedFilter", finalPredefinedFilter);
            console.log("finalSavedFilter", finalSavedFilter);
            console.log("finalSearchFilter", finalSearchFilter);

            const finalFilter = mergeAllDiffFilters(finalCustomFilter, finalSearchFilter, finalSavedFilter, finalPredefinedFilter)
            handleApplyCustomFilter(finalFilter);
            // }
        }
    }, [refreshKey]);


    // Handle predefined search selection

    const hasCustomFilterChanged = () => {
        if (!predefinedSearchChip || !customFilter || !predefinedSearchBaseFilter) {
            return false;
        }
        // Deep comparison to check if filter has changed
        return JSON.stringify(customFilter) !== JSON.stringify(predefinedSearchBaseFilter);
    };

    const openSavedCustomFilter = async (savedfilter: any) => {
        //Open custom filter popup 
        // router.push(`?savedQuery=${savedfilter.id}`);
        // setShowGlobalSearchElement(true);
        // // dont refetch the data yet
        // const customFilter = JSON.parse(savedfilter.filterQueryJson);
        // setCustomFilter(customFilter ? customFilter : null);
        // if (customFilter) {
        //     const formatedCustomChips: FilterRule = transformFiltersToRules(customFilter ? customFilter : null);
        //     setFilterRules(formatedCustomChips ? [formatedCustomChips] : initialState);
        // }


        setSearchChips([]);
        setSearchFilter(null);
        setFilterRules(initialState);
        setCustomFilter(null)
        setPredefinedSearchChip(null);
        setPredefinedSearchBaseFilter(null);

        // push the savedQuery=1 in url 
        if (savedfilter?.id) {
            const savedfilterId = savedfilter.id;
            // router.push(`?savedQuery=${savedfilter.id}`);
            setShowOverlay(false);
            const currentSavedFilterData: any = savedFilters.find((savedFilter: any) => savedFilter.id === savedfilterId);
            setCurrentSavedFilterData(currentSavedFilterData);
            if (currentSavedFilterData) {
                const filterJson = JSON.parse(currentSavedFilterData?.filterQueryJson);
                if (filterJson) {
                    let finalSavedFilter = filterJson
                    setCurrentSavedFilterQuery(finalSavedFilter)
                    const rules: FilterRule = transformFiltersToRules(finalSavedFilter ? finalSavedFilter : null);
                    const hydratedRules = await hydrateRelationRules(
                        [rules],
                        viewData
                    );
                    setCurrentSavedFilterRules(hydratedRules ? hydratedRules : initialState);
                    setShowSavedFilterComponent(true)
                }
            }
        } else {
            console.error(ERROR_MESSAGES.SAVE_FILTER_UNDEFINED_NULL);
        }

    }
    const deleteSavedFilter = async () => {
        // delte the saved filter with id 
        await deleteEntity(savedFilterTobeDeleted);
        // triggerGetSolidEntities(savedFilterQueryString);
        let parsedSearchParams = searchParams;
        const savedQuery = parsedSearchParams?.get("savedQuery");
        if (savedFilterTobeDeleted == savedQuery) {
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.delete("savedQuery");
            router.push(`?${urlParams.toString()}`);
        }
        setIsDeleteSQDialogVisible(false);
        setTimeout(() => {
            setSavedFilterFetchDataRefreshKey(prev => prev + 1)
        }, 500)
    }
    const handleSaveFilter = async (formValues: any) => {
        setShowSaveFilterPopup(false)

        try {
            if (formValues.id) {
                const filterJson = currentSavedFilterQuery;
                const formData = new FormData();
                formData.append("name", formValues.name);
                formData.append("filterQueryJson", JSON.stringify(filterJson, null, 2));
                formData.append("modelId", viewData?.data?.solidView?.model?.id);
                formData.append("viewId", viewData?.data?.solidView?.id);
                formData.append("isPrivate", formValues.isPrivate);
                formData.append("userId", user?.id);

                await updateEntity({ id: +formValues.id, data: formData }).unwrap();

                setSearchChips([]);
                setSearchFilter(null);
                setFilterRules(initialState);
                setCustomFilter(null)
                setPredefinedSearchChip(null);
                const currentPageUrl = window.location.pathname; // Get the current page URL
                localStorage.removeItem(currentPageUrl); // Store in local storage with the URL as the key

                setPredefinedSearchBaseFilter(null);
                setTimeout(() => {
                    router.push(`?savedQuery=${formValues.id}`);
                }, 500)
            } else {

                const filterJson = customFilter;
                const formData = new FormData();
                formData.append("name", formValues.name);
                formData.append("filterQueryJson", JSON.stringify(filterJson, null, 2));
                formData.append("modelId", viewData?.data?.solidView?.model?.id);
                formData.append("viewId", viewData?.data?.solidView?.id);
                formData.append("isPrivate", formValues.isPrivate);
                formData.append("userId", user?.id);
                const result = await createEntity(formData).unwrap();

                setSearchChips([]);
                setSearchFilter(null);
                setFilterRules(initialState);
                setCustomFilter(null)
                setPredefinedSearchChip(null);
                setPredefinedSearchBaseFilter(null);

                const currentPageUrl = window.location.pathname; // Get the current page URL
                localStorage.removeItem(currentPageUrl); // Store in local storage with the URL as the key

                setTimeout(() => {
                    router.push(`?savedQuery=${result.data.id}`);
                }, 500)

            }
        } catch (error) {

        }
    }



    useEffect(() => {
        // Explicitly type the event as a MouseEvent
        function handleClickOutside(event: MouseEvent) {
            if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
                setShowOverlay(false);
            }
        }
        if (showOverlay) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showOverlay]);

    const CustomChip = () => {
        console.log("customFilter", customFilter);
        const ruleCount =
            customFilter?.$or?.length ??
            customFilter?.$and?.length ??
            Object.keys(customFilter || {}).length;

        return (
            <li>
                <div className="custom-filter-chip-type">
                    <div className="flex align-items-center gap-2 text-base">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"
                            onClick={() => {
                                setShowGlobalSearchElement(true)
                            }
                            }>
                            <rect width="20" height="20" rx="4" fill="#722ED1" />
                            <path d="M8.66667 15V13.3333H11.3333V15H8.66667ZM6 10.8333V9.16667H14V10.8333H6ZM4 6.66667V5H16V6.66667H4Z"
                                fill="white" />
                        </svg>
                        <span><strong>{ruleCount}</strong> rules applied</span>
                    </div>

                    {/* button to clear filter */}
                    <a onClick={clearCustomFilter}
                        style={{ cursor: "pointer" }}
                    >
                        <i className="pi pi-times ml-1">
                        </i></a>
                </div>
            </li>
        )
    };


    //saved filter related code start

    const applySavedFilter = (savedfilter: any) => {

        setSearchChips([]);
        setSearchFilter(null);
        setFilterRules(initialState);
        setCustomFilter(null)
        setPredefinedSearchChip(null);
        setPredefinedSearchBaseFilter(null);
        const currentPageUrl = window.location.pathname; // Get the current page URL
        localStorage.removeItem(currentPageUrl); // Store in local storage with the URL as the key
        // push the savedQuery=1 in url 
        if (savedfilter?.id) {
            router.push(`?savedQuery=${savedfilter.id}`);
            setShowOverlay(false);
        } else {
            console.error(ERROR_MESSAGES.SAVE_FILTER_UNDEFINED_NULL);
        }
    }

    const removeSavedFilter = () => {
        const params = new URLSearchParams(searchParams.toString());
        setCurrentSavedFilterData(null);
        setCurrentSavedFilterQuery(null)
        if (params.has("savedQuery")) {
            params.delete("savedQuery");
            const newUrl = params.toString()
                ? `${pathname}?${params.toString()}`
                : pathname;
            router.push(newUrl);
        }
    }


    const SavedFiltersChip = () => {

        return (
            <li>
                <div className="custom-filter-chip-type">
                    <div className="flex align-items-center gap-2 text-base">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"
                            onClick={() => {
                                const fn = async () => {
                                    if (currentSavedFilterQuery) {
                                        const rules: FilterRule = transformFiltersToRules(currentSavedFilterQuery ? currentSavedFilterQuery : null);
                                        const hydratedRules = await hydrateRelationRules(
                                            [rules],
                                            viewData
                                        );
                                        setCurrentSavedFilterRules(hydratedRules ? hydratedRules : initialState);
                                        setShowSavedFilterComponent(true)
                                    }
                                }
                                fn()
                            }
                            }
                        >
                            <rect width="20" height="20" rx="4" fill="#722ED1" />
                            <path d="M8.66667 15V13.3333H11.3333V15H8.66667ZM6 10.8333V9.16667H14V10.8333H6ZM4 6.66667V5H16V6.66667H4Z"
                                fill="white" />
                        </svg>
                        <span><strong>{currentSavedFilterData?.name}</strong></span>
                    </div>

                    {/* button to clear filter */}
                    <a onClick={removeSavedFilter}
                        style={{ cursor: "pointer" }}
                    >
                        <i className="pi pi-times ml-1">
                        </i></a>
                </div>
            </li>
        )
    };




    //saved filter related code end


    // search related code start

    const handleRemoveChipGroup = (columnName: string) => {
        const updatedChips = searchChips.filter(chip => chip.columnName !== columnName);
        setSearchChips(updatedChips);
        setHasSearched(true);
        setRefreshKey((prev) => prev + 1)

    };

    const groupedSearchChips = searchChips.reduce((acc: Record<string, string[]>, chip) => {
        const key = chip.columnName;
        if (!key) return acc; // skip if undefined

        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(chip.value);
        return acc;
    }, {});


    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && inputValue?.trim()) {
            handleAddChip();
            e.preventDefault();
            setShowOverlay(false);
        } else if (e.key === "Backspace" && inputValue === "") {

            if (searchChips.length > 0) {
                setSearchChips((prev) => prev.slice(0, -1));
            } else if (customFilter) {
                setCustomFilter(null)
                setFilterRules(initialState);
            } else if (predefinedSearchChip) {
                setPredefinedSearchChip(null);
                setPredefinedSearchBaseFilter(null);
            } else if (activeSavedFilter) {
                removeSavedFilter()
            } else if (activeSavedFilter) {
                clearCustomFilter();
            }
            setHasSearched(true);
            setRefreshKey((prev) => prev + 1)
        }
    };

    const SearchChip = () => (
        <>
            {Object.entries(groupedSearchChips).map(([column, values]) => {
                const fieldMeta = searchableFields.find(f => f.fieldName === column);
                const columnDisplayName = fieldMeta?.displayName || column;

                return (
                    <li key={column}>
                        <div className="search-filter-chip-type">
                            <div>{columnDisplayName}</div>
                            {values.map((value, index) => (
                                <React.Fragment>
                                    {/* displayname */}
                                    <span key={index} className="custom-chip-value">{value}
                                    </span>
                                    {index < values.length - 1 &&
                                        <span className="custom-chip-or">or</span>
                                    }
                                </React.Fragment>
                            ))}
                            {/* button to clear filter */}
                            <i className="pi pi-times ml-1"
                                style={{ cursor: "pointer" }}
                                onClick={() => handleRemoveChipGroup(column)}
                            >
                            </i>
                        </div>
                    </li>
                )
            })}
        </>
    );

    // search related code end


    // predefinedfilter related code start

    const handlePredefinedSearch = (predefinedSearch: any) => {
        if (!inputValue?.trim()) return;

        if (!predefinedSearch?.filters) {
            console.error('Invalid predefined search: missing filters', predefinedSearch);
            return;
        }

        try {
            // Replace {{search}} placeholders with actual search value
            const processedFilter = replacePlaceholders(predefinedSearch.filters, inputValue.trim());

            // Clear all existing filters and searches
            // setSearchChips([]);
            // setSearchFilter(null);
            // setFilterRules(initialState);
            // setCustomFilter(null)
            // removeSavedFilter();
            // Set the predefined search chip
            setPredefinedSearchChip({
                name: predefinedSearch.name,
                value: inputValue.trim()
            });

            setPredefinedSearchBaseFilter(processedFilter);

            // Apply the predefined search filter as custom filter
            // setCustomFilter(processedFilter);

            // Apply the filter
            // handleApplyCustomFilter(finalFilter);

            // Clear input and close overlay
            setInputValue("");
            setShowOverlay(false);
            setHasSearched(true);
            setRefreshKey((prev) => prev + 1)
        } catch (error) {
            console.error('Error applying predefined search:', error);
            // Optionally show user-friendly error message
        }
    };


    const removePredefinedSearchChip = () => {
        setPredefinedSearchChip(null);
        setPredefinedSearchBaseFilter(null)
        setCustomFilter(null);
        // handleApplyCustomFilter(finalFilter);
        setHasSearched(true);
        setRefreshKey((prev) => prev + 1)
    };

    const PredefinedSearchChip = () => (
        <li>
            <div className="search-filter-chip-type">
                <div className="flex align-items-center gap-2">
                    <strong>{predefinedSearchChip?.name}:</strong>
                    <span className="custom-chip-value">{predefinedSearchChip?.value}</span>
                </div>
                {/* button to clear filter */}
                <i className="pi pi-times ml-1"
                    style={{ cursor: "pointer" }}
                    onClick={removePredefinedSearchChip}
                >
                </i>
            </div>
        </li>
    );

    // predefinedfilter related code end

    return (
        <>
            <div className="flex justify-content-center solid-custom-filter-wrapper relative">
                <div className="solid-global-search-element">
                    <ul className="">
                        {currentSavedFilterData && <SavedFiltersChip />}
                        {predefinedSearchChip && <PredefinedSearchChip />}
                        {customFilter && <CustomChip />}
                        <SearchChip />
                        <li ref={chipsRef}>
                            <div className="relative solid-global-search-element-wrapper">
                                <InputText
                                    value={inputValue || ""}
                                    placeholder="Search."
                                    onChange={(e) => {
                                        setInputValue(e.target.value);
                                        setShowOverlay(true);
                                    }}
                                    onFocus={() => {
                                        if (inputValue?.trim()) setShowOverlay(true);
                                    }}
                                    onBlur={() => {
                                        // Delay so you can click buttons inside overlay
                                        setTimeout(() => setShowOverlay(false), 150);
                                    }}

                                    onKeyDown={handleKeyDown}
                                />
                                <Button
                                    icon="pi pi-search"
                                    style={{ fontSize: 10 }}
                                    severity="secondary"
                                    outlined size="small"
                                    onClick={() => setShowOverlay(true)}
                                    className="custom-filter-button"
                                />
                            </div>
                        </li>
                    </ul>
                </div>

                {showOverlay && (
                    <div ref={overlayRef} className="absolute w-full z-5 shadow-2 solid-search-overlay-pannel" style={{ top: 35, background : "var(--surface-0)", border: '1px solid var(--surface-300) !important', borderRadius :'6px'}}>
                    {/* <div ref={overlayRef} className="absolute w-full z-5 surface-0 border-round border-1 border-300 shadow-2 solid-search-overlay-pannel" style={{ top: 35 }}> */}
                        {inputValue ? (
                            <>
                                <div className="custom-filter-search-options px-3 py-2 flex flex-column">
                                    <h6 className="my-1 font-bold">Search By Fields</h6>
                                    {
                                        searchableFields.map((value: any, index: any) => {
                                            // console.log("value", value);

                                            return (
                                                <Button
                                                    key={index}
                                                    className="p-2 flex gap-1 text-color"
                                                    // onClick={() => handleAddChip(value)}
                                                    onMouseDown={(e) => {
                                                        // Prevent focus loss from input
                                                        e.preventDefault();
                                                        const currentValue = inputValue?.trim();
                                                        if (currentValue) {
                                                            const values = currentValue.split(",").map((v) => v.trim()).filter((v) => v !== "");
                                                            const chipsToAdd = values.map(v => ({
                                                                columnName: value.fieldName,
                                                                value: v,
                                                                columnDisplayName: value.displayName,
                                                                searchField: value.searchField,
                                                                matchMode: value.matchMode
                                                            }));
                                                            setSearchChips((prev) => [...prev, ...chipsToAdd]);
                                                            setInputValue("");
                                                            setHasSearched(true);
                                                            setRefreshKey((prev) => prev + 1)
                                                            setShowOverlay(false);
                                                        }
                                                    }}
                                                    text
                                                    severity="secondary"
                                                    size="small"
                                                >
                                                    Search <strong>{value.displayName}</strong> for: <span className="font-bold text-color">{inputValue}</span>
                                                </Button>
                                            )
                                        })
                                    }
                                </div>
                                {predefinedSearches && predefinedSearches.length > 0 && (
                                    <>
                                        <Divider className="m-0" />
                                        <div className="custom-filter-search-options px-3 py-2 flex flex-column">
                                            <h6 className="my-1 font-bold">Predefined Searches</h6>
                                            {predefinedSearches.map((predefinedSearch: any, index: number) => (
                                                <Button
                                                    key={index}
                                                    className="p-2 flex flex-column align-items-start gap-1 text-color"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        handlePredefinedSearch(predefinedSearch);
                                                    }}
                                                    text
                                                    severity="secondary"
                                                    size="small"
                                                >
                                                    <div className="flex gap-1 align-items-center">
                                                        <strong>{predefinedSearch.name}:</strong>
                                                        <span className="font-bold text-color">{inputValue}</span>
                                                    </div>
                                                    <div className="text-xs">{predefinedSearch.description}</div>
                                                </Button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        ) :
                            <>
                                <div className="p-3 text-base">Search Here...</div>
                                <Divider className="m-0" />
                            </>
                        }
                        {savedFilters.length > 0 &&
                            <>
                                <div className="p-3">
                                    <p className="font-medium">Saved Filters</p>
                                    <div className="flex flex-column gap-2">
                                        {savedFilters.map((savedfilter: any) =>
                                            <SavedFilterList savedfilter={savedfilter} activeSavedFilter={activeSavedFilter} applySavedFilter={applySavedFilter} openSavedCustomFilter={openSavedCustomFilter} setSavedFilterTobeDeleted={setSavedFilterTobeDeleted} setIsDeleteSQDialogVisible={setIsDeleteSQDialogVisible}></SavedFilterList>
                                        )}
                                    </div>
                                </div>
                                <Divider className="m-0" />
                            </>
                        }
                        <div className="px-2 py-1">
                            <Button text size="small" label="Custom Filter" iconPos="left" icon='pi pi-plus' onClick={() => setShowGlobalSearchElement(true)} className="font-bold" />
                        </div>
                    </div>
                )
                }
                <Dialog header={false} className="solid-global-search-filter" showHeader={false} visible={showGlobalSearchElement} style={{ width: '65vw' }} breakpoints={{ '1024px': '75vw', '991px': '90vw', '767px': '94w', '250px': '96vw' }} onHide={() => { if (!showGlobalSearchElement) return; setShowGlobalSearchElement(false); }}>
                    <div className="flex align-items-center justify-content-between px-3">
                        <h5 className="solid-custom-title m-0">Add Custom Filter</h5>
                        <Button icon="pi pi-times" rounded text aria-label="Cancel" type="reset" size="small" onClick={() => setShowGlobalSearchElement(false)} />
                    </div>
                    <Divider className="m-0" />
                    <div className="p-3 lg:p-4">
                        {fields.length > 0 &&
                            <FilterComponent viewData={viewData} fields={fields} filterRules={filterRules} setFilterRules={setFilterRules} transformFilterRules={transformCustomFilterRules} closeDialog={() => setShowGlobalSearchElement(false)}></FilterComponent>
                        }
                    </div>
                </Dialog>
                <Dialog header={false} className="solid-global-search-filter" showHeader={false} visible={showSavedFilterComponent} style={{ width: '65vw' }} breakpoints={{ '1024px': '75vw', '991px': '90vw', '767px': '94w', '250px': '96vw' }} onHide={() => { if (!showSavedFilterComponent) return; setShowSavedFilterComponent(false); }}>
                    <div className="flex align-items-center justify-content-between px-3">
                        <h5 className="solid-custom-title m-0">Saved Filter</h5>
                        <Button icon="pi pi-times" rounded text aria-label="Cancel" type="reset" size="small" onClick={() => setShowSavedFilterComponent(false)} />
                    </div>
                    <Divider className="m-0" />
                    <div className="p-3 lg:p-4">
                        {fields.length > 0 &&
                            <FilterComponent viewData={viewData} fields={fields} filterRules={currentSavedFilterRules} setFilterRules={setCurrentSavedFilterRules} transformFilterRules={transformSavedFilterRules} closeDialog={() => setShowSavedFilterComponent(false)}></FilterComponent>
                        }
                    </div>
                </Dialog>
                <Dialog header="Save Custom Filter" className="solid-custom-filter-dialog" visible={showSaveFilterPopup} style={{ width: 500 }} onHide={() => { if (!showSaveFilterPopup) return; setShowSaveFilterPopup(false); }}>
                    <SolidSaveCustomFilterForm currentSavedFilterData={currentSavedFilterData} handleSaveFilter={handleSaveFilter} closeDialog={setShowSaveFilterPopup}></SolidSaveCustomFilterForm>
                </Dialog>

                <Dialog
                    visible={isDeleteSQDialogVisible}
                    header="Confirm Delete"
                    modal
                    className="solid-confirm-dialog"
                    footer={() => (
                        <div className="flex justify-content-center">
                            <Button label="Yes" icon="pi pi-check" className='small-button' severity="danger" autoFocus onClick={deleteSavedFilter} />
                            <Button label="No" icon="pi pi-times" className='small-button' onClick={() => setIsDeleteSQDialogVisible(false)} />
                        </div>
                    )}
                    onHide={() => setIsDeleteSQDialogVisible(false)}
                >
                    <p>Are you sure you want to delete the {currentSavedFilterData?.name} saved query?</p>
                </Dialog>
            </div>
            {/* <div>
                <Button
                    icon="pi pi-save"
                    style={{ fontSize: 10 }}
                    severity="secondary"
                    outlined size="small"
                    onClick={() => {
                        setShowSaveFilterPopup(true)
                    }}
                />
            </div> */}
        </>
    )
});
