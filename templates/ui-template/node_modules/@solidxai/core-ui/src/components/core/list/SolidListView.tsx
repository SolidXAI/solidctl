// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  DataTable,
  DataTableFilterMeta,
  DataTableStateEvent,
} from "primereact/datatable";
import { Column } from "primereact/column";
import { FilterMatchMode } from "primereact/api";
import Link from "../../common/Link";
import qs from "qs";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { createSolidEntityApi } from "../../../redux/api/solidEntityApi";
import { useGetSolidViewLayoutQuery } from "../../../redux/api/solidViewApi";
import { SolidListViewColumn } from "./SolidListViewColumn";
// import { SolidListViewOptions } from "../common/SolidListviewOptions";
import { SolidCreateButton } from "../common/SolidCreateButton";
import { SolidGlobalSearchElement } from "../common/SolidGlobalSearchElement";
import { pascalCase } from "change-case";
import { useLazyCheckIfPermissionExistsQuery } from "../../../redux/api/userApi";
import { permissionExpression } from "../../../helpers/permissions";
import { usePathname } from "../../../hooks/usePathname";
import { useRouter } from "../../../hooks/useRouter";
import { useSearchParams } from "../../../hooks/useSearchParams";
import { ListViewRowActionPopup } from "./ListViewRowActionPopup";
import FilterComponent, { FilterOperator, FilterRule, FilterRuleType } from "../../../components/core/common/FilterComponent";
import { SolidLayoutViews } from "../common/SolidLayoutViews";
import { FilterIcon } from '../../../components/modelsComponents/filterIcon';
import { OverlayPanel } from "primereact/overlaypanel";
import { Toast } from "primereact/toast";
import { Divider } from "primereact/divider";
import CompactImage from '../../../resources/images/layout/images/compact.png';
import CozyImage from '../../../resources/images/layout/images/cozy.png';
import ComfortableImage from '../../../resources/images/layout/images/comfortable.png';
import KanbanImage from '../../../resources/images/layout/images/kanban.png';
import { capitalize, filter, set } from "lodash";
import Lightbox from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Download from "yet-another-react-lightbox/plugins/download";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";
import { SolidListViewConfigure } from "./SolidListViewConfigure";
import { SolidListViewShimmerLoading } from "./SolidListViewShimmerLoading";
import { SolidEmptyListViewPlaceholder } from "./SolidEmptyListViewPlaceholder";
import { useHandleListCustomButtonClick } from "../../../components/common/useHandleListCustomButtonClick";
import { hasAnyRole } from "../../../helpers/rolesHelper";
import { SolidListViewHeaderButton } from "./SolidListViewHeaderButton";
import { SolidListViewRowButtonContextMenu } from "./SolidListViewRowButtonContextMenu";
import { useDispatch, useSelector } from "react-redux";
import styles from "./SolidListViewWrapper.module.css";
import { SolidXAIIcon } from "../solid-ai/SolidXAIIcon";
import { SolidBeforeListDataLoad, SolidListUiEventResponse, SolidLoadList } from "../../../types/solid-core";
import { getExtensionFunction } from "../../../helpers/registry";
import { useSession } from "../../../hooks/useSession";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import { SolidAiMainWrapper } from "../solid-ai/SolidAiMainWrapper";
import { showNavbar, toggleNavbar } from "../../../redux/features/navbarSlice";
import { useLazyGetMcpUrlQuery, useLazyGetSolidSettingsQuery } from "../../../redux/api/solidSettingsApi";
import { log } from "console";
import { normalizeSolidListKanbanActionPath } from "../../../helpers/routePaths";
// import { ERROR_MESSAGES } from "../../../constants/error-messages";

const getRandomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const queryStringToQueryObject = () => {
  const currentPageUrl = window.location.pathname; // Get the current page URL
  const encodedQueryString = localStorage.getItem(currentPageUrl); // Retrieve the encoded query string from local storage

  if (encodedQueryString) {
    try {
      const decodedQueryString = atob(encodedQueryString); // Base64 decode the string
      const parsedParams = JSON.parse(decodedQueryString); // Parse the decoded string into an object
      return parsedParams;
    } catch (error) {
      console.error(
        ERROR_MESSAGES.ERROR_DECODING,
        error
      );
    }
  }
};


export const queryStringToQueryObjectByUrl = (url) => {
  const currentPageUrl = url; // Get the current page URL
  const encodedQueryString = localStorage.getItem(currentPageUrl); // Retrieve the encoded query string from local storage

  if (encodedQueryString) {
    try {
      const decodedQueryString = atob(encodedQueryString); // Base64 decode the string
      const parsedParams = JSON.parse(decodedQueryString); // Parse the decoded string into an object
      return parsedParams;
    } catch (error) {
      console.error(
        ERROR_MESSAGES.ERROR_DECODING,
        error
      );
    }
  }
};

export const queryObjectToQueryString = (queryObject: string) => {
  if (queryObject) {
    const stringifiedObject = JSON.stringify(queryObject);
    // const stringifiedObject = qs.stringify(queryObject, { encodeValuesOnly: true, arrayFormat: "brackets" });
    const encodedQueryString = btoa(stringifiedObject); // Base64 encode the stringified object
    const currentPageUrl = window.location.pathname; // Get the current page URL
    localStorage.setItem(currentPageUrl, encodedQueryString); // Store in local storage with the URL as the key
    return encodedQueryString;
  }
  return null;
};


export const queryObjectToQueryStringByUrl = (url, queryObject: string) => {
  if (queryObject) {
    const stringifiedObject = JSON.stringify(queryObject);
    // const stringifiedObject = qs.stringify(queryObject, { encodeValuesOnly: true, arrayFormat: "brackets" });
    const encodedQueryString = btoa(stringifiedObject); // Base64 encode the stringified object
    const currentPageUrl = url; // Get the current page URL
    localStorage.setItem(currentPageUrl, encodedQueryString); // Store in local storage with the URL as the key
    return encodedQueryString;
  }
  return null;
};

type SolidListViewParams = {
  moduleName: string;
  modelName: string;
  inlineCreate?: boolean;
  handlePopUpOpen?: any;
  embeded?: boolean;
  customLayout?: any;
  customFilter?: any;
};

export const SolidListView = (params: SolidListViewParams) => {
  const session = useSession();
  const user = session?.data?.user;
  const dispatch = useDispatch();
  const visibleNavbar = useSelector((state: any) => state.navbarState?.visibleNavbar);

  const pathname = usePathname();
  const solidGlobalSearchElementRef = useRef();

  const router = useRouter();
  const searchParams = useSearchParams();
  const localeName = searchParams.get("locale");
  const [filters, setFilters] = useState<any>(params.customFilter || null);

  // const [customFilter, setCustomFilter] = useState<FilterRule[]>(initialState);
  // const [showGlobalSearchElement, setShowGlobalSearchElement] = useState<boolean>(false);

  const [toPopulate, setToPopulate] = useState<string[]>([]);
  const [toPopulateMedia, setToPopulateMedia] = useState<string[]>([]);
  const [actionsAllowed, setActionsAllowed] = useState<string[]>([]);
  const [isOpenSolidXAiPanel, setIsOpenSolidXAiPanel] = useState(false);
  const [chatterWidth, setChatterWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const [triggerCheckIfPermissionExists] = useLazyCheckIfPermissionExistsQuery();

  const handleCustomButtonClick = useHandleListCustomButtonClick();

  const [mcpUrl, setMcpUrl] = useState<string | null>(null);
  const [getMcpUrl] = useLazyGetMcpUrlQuery();

  const [trigger, { data: solidSettingsData }] = useLazyGetSolidSettingsQuery();
  useEffect(() => {
    trigger("") // Fetch settings on mount
  }, [])

  const editBaseUrl = useMemo(
    () => normalizeSolidListKanbanActionPath(pathname, editButtonUrl || "form"),
    [editButtonUrl, pathname]
  );

  useEffect(() => {
    if (solidSettingsData?.data?.mcpEnabled && solidSettingsData?.data?.mcpServerUrl) {
      enableSolidXAiPanel();
    }
  }, [solidSettingsData]);

  const enableSolidXAiPanel = async () => {
    try {
      const queryData = {
        showHeader: "true",
        inListView: "true"
      };
      const queryString = qs.stringify({ ...queryData }, { encodeValuesOnly: true });
      const response = await getMcpUrl(queryString).unwrap();
      console.log("response", response);
      if (response && response?.data?.mcpUrl) {
        setMcpUrl(response?.data?.mcpUrl);
      }
    } catch (error) {

    }
  }


  useEffect(() => {
    const storedOpen = localStorage.getItem("l_solidxai_open");
    const storedWidth = localStorage.getItem("l_solidxai_width");

    if (storedOpen !== null) {
      setIsOpenSolidXAiPanel(storedOpen === "true");
    }

    if (storedWidth !== null) {
      const width = parseInt(storedWidth, 10);
      if (!isNaN(width)) {
        setChatterWidth(width);
      }
    }
  }, []);

  useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e: MouseEvent) => {
        const newWidth = window.innerWidth - e.clientX;
        const clampedWidth = Math.max(280, Math.min(newWidth, 700));
        setChatterWidth(clampedWidth);
        localStorage.setItem("l_solidxai_width", clampedWidth.toString());
      };

      const handleMouseUp = () => {
        setIsResizing(false);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing]);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (params.modelName) {
        const permissionNames = [
          permissionExpression(params.modelName, 'create'),
          permissionExpression(params.modelName, 'delete'),
          permissionExpression(params.modelName, 'update'),
          permissionExpression(params.modelName, 'deleteMany'),
          permissionExpression(params.modelName, 'findOne'),
          permissionExpression(params.modelName, 'findMany'),
          permissionExpression(params.modelName, 'insertMany'),
          permissionExpression('importTransaction', 'create'),
          permissionExpression('exportTransaction', 'create'),
          permissionExpression('userViewMetadata', 'create'),
          permissionExpression('savedFilters', 'create')
        ];
        const queryData = {
          permissionNames: permissionNames,
        };
        const queryString = qs.stringify(queryData, {
          encodeValuesOnly: true,
        });
        const response = await triggerCheckIfPermissionExists(queryString);
        setActionsAllowed(response.data.data);
      }
    };
    fetchPermissions();
  }, [params.modelName]);

  const isFilterApplied = filters ? true : false;

  // Create the RTK slices for this entity
  const entityApi = createSolidEntityApi(params.modelName);
  const {
    useCreateSolidEntityMutation,
    useDeleteMultipleSolidEntitiesMutation,
    useDeleteSolidEntityMutation,
    useGetSolidEntitiesQuery,
    useGetSolidEntityByIdQuery,
    useLazyGetSolidEntitiesQuery,
    useLazyGetSolidEntityByIdQuery,
    usePrefetch,
    useUpdateSolidEntityMutation,
    useRecoverSolidEntityByIdQuery,
    useLazyRecoverSolidEntityByIdQuery,
    useRecoverSolidEntityMutation,
  } = entityApi;

  const menuItemId = searchParams.get("menuItemId");
  const menuItemName = searchParams.get("menuItemName");
  const actionId = searchParams.get("actionId");
  const actionName = searchParams.get("actionName");
  // Get the list view layout & metadata first.
  const listViewMetaDataQs = qs.stringify(
    {
      modelName: params.modelName,
      moduleName: params.moduleName,
      viewType: "list",
      menuItemId: menuItemId,
      menuItemName: menuItemName,
      actionId: actionId,
      actionName: actionName,
    },
    {
      encodeValuesOnly: true,
    }
  );

  const [solidListViewMetaData, setSolidListViewMetaData] = useState(null);
  const [solidListViewLayout, setSolidListViewLayout] = useState(null);
  const [isDraftPublishWorkflowEnabled, setIsDraftPublishWorkflowEnabled] = useState(false);
  const {
    data: solidListViewInitialMetaData,
    error: solidListViewMetaDataError,
    isLoading: solidListViewMetaDataIsLoading,
    isError: solidListViewMetaDataIsError,
    refetch,
  } = useGetSolidViewLayoutQuery(listViewMetaDataQs);

  const initialFilterMethod = () => {
    const solidView = solidListViewMetaData?.data?.solidView;
    const solidFieldsMetadata =
      solidListViewMetaData?.data?.solidFieldsMetadata;

    const initialFilters: any = {};
    const toPopulate: string[] = [];
    const toPopulateMedia: string[] = [];
    const currentLayout = params.customLayout ? params.customLayout : solidView?.layout;
    for (let i = 0; i < currentLayout?.children.length; i++) {
      const column = currentLayout?.children[i];
      const fieldMetadata = solidFieldsMetadata?.[column.attrs.name];
      if (!fieldMetadata?.type) {
        console.log(`Some problem in rendering column: `, column);
        showFieldError(ERROR_MESSAGES.FIELD_NOT_IN_METADATA(column.attrs.label));
        // return;
      }
      if (fieldMetadata) {
        // Form the initial filters after iterating over the columns and field metadata.
        if (
          ["int", "bigint", "float", "decimal"].includes(fieldMetadata?.type)
        ) {
          // initialFilters[column.attrs.name] = { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
          initialFilters[column.attrs.name] = {
            value: null,
            matchMode: FilterMatchMode.EQUALS,
          };
        } else if (
          ["date", "datetime", "time", "boolean"].includes(fieldMetadata?.type)
        ) {
          // initialFilters[column.attrs.name] = { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.DATE_IS }] }
          initialFilters[column.attrs.name] = {
            value: null,
            matchMode: FilterMatchMode.EQUALS,
          };
        } else if (
          ["relation", "selectionStatic", "selectionDynamic"].includes(
            fieldMetadata?.type
          )
        ) {
          initialFilters[column.attrs.name] = {
            value: null,
            matchMode: FilterMatchMode.IN,
          };
        } else {
          // initialFilters[column.attrs.name] = { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] }
          initialFilters[column.attrs.name] = {
            value: null,
            matchMode: FilterMatchMode.STARTS_WITH,
          };
        }

        if (column.attrs.name === "id") {
          initialFilters[column.attrs.name] = {
            value: null,
            matchMode: FilterMatchMode.IN,
          };
        }

        // Form the "toPopulate" array.
        if (fieldMetadata.type === "relation") {
          if (!toPopulate.includes(fieldMetadata.name)) {
            toPopulate.push(fieldMetadata.name);
          }
        }
        if (
          fieldMetadata.type === "mediaSingle" ||
          fieldMetadata.type === "mediaMultiple"
        ) {
          if (!toPopulateMedia.includes(fieldMetadata.name)) {
            toPopulateMedia.push(fieldMetadata.name);
          }
        }
      }
    }
    const populate = toPopulate;
    const populateMedia = toPopulateMedia;
    const rows = currentLayout?.attrs?.defaultPageSize ?? 25;
    const sortField = "id";
    const sortOrder = -1;
    // setRows(rows);
    // setToPopulate(populate);
    // setToPopulateMedia(populateMedia);
    // setSortField("id");
    // setSortOrder(-1);
    return { sortField, sortOrder, rows, populate, populateMedia };
  };

  // Set the initial filter state based on the metadata.
  useEffect(() => {
    // refetch();
    if (solidListViewInitialMetaData) {
      if (params.customLayout) {
        setSolidListViewLayout(params.customLayout);
      } else {
        setSolidListViewLayout(solidListViewInitialMetaData?.data.solidView.layout);
      }
      setSolidListViewMetaData(solidListViewInitialMetaData);
      setIsDraftPublishWorkflowEnabled(solidListViewInitialMetaData?.data?.solidView?.model?.draftPublishWorkflow === true);
    }
  }, [solidListViewInitialMetaData]);

  // set layout and actions for create and edit buttons and view modes
  // useEffect(() => {
  //   if (solidListViewMetaData) {
  //     const listLayoutAttrs = solidListViewMetaData?.data?.solidView?.layout?.attrs;
  //     const createActionUrl = listLayoutAttrs?.createAction && listLayoutAttrs?.createAction?.type === "custom" ? listLayoutAttrs?.createAction?.customComponent : "form/new";
  //     const editActionUrl = listLayoutAttrs?.editAction && listLayoutAttrs?.editAction?.type === "custom" ? listLayoutAttrs?.editAction?.customComponent : "form";

  //     if (listLayoutAttrs?.createAction) {
  //       setCreateActionQueryParams({
  //         actionName: listLayoutAttrs.createAction.name,
  //         actionType: listLayoutAttrs.createAction.type,
  //         actionContext: listLayoutAttrs.createAction.context,
  //       });
  //     }
  //     if (listLayoutAttrs?.editAction) {
  //       setEditActionQueryParams({
  //         actionName: listLayoutAttrs.editAction.name,
  //         actionType: listLayoutAttrs.editAction.type,
  //         actionContext: listLayoutAttrs.editAction.context,
  //       });
  //     }

  //     const viewModes = listLayoutAttrs?.allowedViews && listLayoutAttrs?.allowedViews.length > 0 && listLayoutAttrs?.allowedViews.map((view: any) => { return { label: capitalize(view), value: view }; });
  //     setViewModes(viewModes);
  //     if (createActionUrl) {
  //       setCreateButtonUrl(createActionUrl);
  //     }
  //     if (editActionUrl) {
  //       setEditButtonUrl(editActionUrl);
  //     }
  //   }
  // }, [solidListViewMetaData]);

  // set layout and actions for create and edit buttons and view modes
  useEffect(() => {
    if (solidListViewLayout) {
      const listLayoutAttrs = solidListViewLayout.attrs;
      const createActionUrl = listLayoutAttrs?.createAction && listLayoutAttrs?.createAction?.type === "custom" ? listLayoutAttrs?.createAction?.customComponent : "form/new";
      const editActionUrl = listLayoutAttrs?.editAction && listLayoutAttrs?.editAction?.type === "custom" ? listLayoutAttrs?.editAction?.customComponent : "form";

      if (listLayoutAttrs?.createAction) {
        setCreateActionQueryParams({
          actionName: listLayoutAttrs.createAction.name,
          actionType: listLayoutAttrs.createAction.type,
          actionContext: listLayoutAttrs.createAction.context,
        });
      }
      if (listLayoutAttrs?.editAction) {
        setEditActionQueryParams({
          actionName: listLayoutAttrs.editAction.name,
          actionType: listLayoutAttrs.editAction.type,
          actionContext: listLayoutAttrs.editAction.context,
        });
      }

      const viewModes = listLayoutAttrs?.allowedViews && listLayoutAttrs?.allowedViews.length > 0 && listLayoutAttrs?.allowedViews.map((view: any) => { return { label: capitalize(view), value: view }; });
      setViewModes(viewModes);
      if (createActionUrl) {
        setCreateButtonUrl(createActionUrl);
      }
      if (editActionUrl) {
        setEditButtonUrl(editActionUrl);
      }
    }
  }, [solidListViewLayout]);

  // All list view state.
  const [listViewData, setListViewData] = useState<any[]>([]);

  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(solidListViewLayout?.attrs?.defaultPageSize ? solidListViewLayout?.attrs?.defaultPageSize : 10);
  const [totalRecords, setTotalRecords] = useState(0);

  const [sortField, setSortField] = useState("id");
  const [sortOrder, setSortOrder] = useState(-1);
  const [selectedRecords, setSelectedRecords] = useState<any[]>([]);
  const [selectedRecoverRecords, setSelectedRecoverRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDialogVisible, setDialogVisible] = useState(false);
  const [isRecoverDialogVisible, setRecoverDialogVisible] = useState(false);
  const [createButtonUrl, setCreateButtonUrl] = useState<string>();
  const [editButtonUrl, setEditButtonUrl] = useState<string>();
  const [createActionQueryParams, setCreateActionQueryParams] = useState<Record<string, string>>({});
  const [editActionQueryParams, setEditActionQueryParams] = useState<Record<string, string>>({});
  const [showArchived, setShowArchived] = useState(false);
  const [queryDataLoaded, setQueryDataLoaded] = useState(false);
  const [customFilter, setCustomFilter] = useState(null);
  const [showSaveFilterPopup, setShowSaveFilterPopup] = useState<boolean>(false);

  const sizeOptions = [
    { label: "Compact", value: "small", image: CompactImage },
    { label: "Cozy", value: "normal", image: CozyImage },
    { label: "Comfortable", value: "large", image: ComfortableImage },
  ];

  // const viewModes = [
  //   { label: 'List ', value: 'list', image: ListImage },
  //   { label: 'Kanban', value: 'kanban', image: KanbanImage },
  // ]

  const [size, setSize] = useState<string | any>(sizeOptions[1].value);
  const [viewModes, setViewModes] = useState<any>([]);

  // Custom Row Action
  const [listViewRowActionPopupState, setListViewRowActionPopupState] = useState(false);
  const [listViewRowActionData, setListRowActionData] = useState<any>();

  const toast = useRef<Toast>(null);

  // Get the list view data.
  const [triggerGetSolidEntities, { data: solidEntityListViewData, isLoading, error },] = useLazyGetSolidEntitiesQuery();

  const [
    triggerRecoverSolidEntitiesById,
    {
      data: recoverByIdData,
      isLoading: recoverByIdIsLoading,
      error: recoverByIdError,
      isError: recoverByIdIsError,
      isSuccess: recoverByIdIsSuccess,
    },
  ] = useLazyRecoverSolidEntityByIdQuery();

  const [
    triggerRecoverSolidEntities,
    {
      data: recoverByData,
      isLoading: recoverByIsLoading,
      error: recoverError,
      isError: recoverIsError,
      isSuccess: recoverByIsSuccess,
    },
  ] = useRecoverSolidEntityMutation();

  // After data is fetched populate the list view state so as to be able to render the data.
  useEffect(() => {
    if (solidEntityListViewData) {
      setLoading(true);
      const cleanedRecords = solidEntityListViewData.records.map((record) => {
        const newRecord = { ...record };

        Object.entries(newRecord).forEach(([key, value]) => {
          if (typeof value === "string") {
            try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) {
                newRecord[key] = parsed.join(", ");
              }
            } catch {
              // If not valid JSON array, optionally strip brackets/quotes
              if (/^\[.*\]$/.test(value)) {
                newRecord[key] = value.replace(/[\[\]"]+/g, "");
              }
            }
          }
        });

        return newRecord;
      });
      setListViewData(cleanedRecords);
      // setListViewData(solidEntityListViewData?.records);
      setTotalRecords(solidEntityListViewData?.meta.totalRecords);
      setLoading(false);
    }
  }, [solidEntityListViewData]);

  const [
    deleteSolidSingleEntiry,
    { isSuccess: isDeleteSolidSingleEntitySuccess },
  ] = useDeleteSolidEntityMutation();

  // Delete mutation
  const [
    deleteManySolidEntities,
    {
      isLoading: isSolidEntitiesDeleted,
      isSuccess: isDeleteSolidEntitiesSucess,
      isError: isSolidEntitiesDeleteError,
      error: SolidEntitiesDeleteError,
      data: DeletedSolidEntities,
    },
  ] = useDeleteMultipleSolidEntitiesMutation();

  // Fetch data after toPopulate has been populated...
  useEffect(() => {
    console.log(
      "useEffect: [isDeleteSolidEntitiesSucess, isDeleteSolidSingleEntitySuccess, recoverByIdIsSuccess, recoverByIsSuccess, solidListViewMetaData]"
    );
    if (solidListViewMetaData && solidListViewLayout) {
      const queryObject = queryStringToQueryObject();

      if (queryObject) {
        const queryData = {
          offset: queryObject.offset || 0,
          limit: queryObject.limit || 25,
          populate: queryObject.populate,
          populateMedia: queryObject.populateMedia,
          sort: queryObject.sort
            ? queryObject.sort?.map((sortItem: string) => {
              const [field, order] = sortItem.split(":");
              return { field, order };
            })
            : [`id:desc`],
          filters: queryObject.filters,
        };
        const filters = {
          $and: [],
        };

        if (queryObject.custom_filter_predicate) {
          filters.$and.push(queryObject.custom_filter_predicate);
        }
        if (queryObject.search_predicate) {
          filters.$and.push(queryObject.search_predicate);
        }
        // if (queryObject.saved_filter_predicate) {
        //   filters.$and.push(queryObject.saved_filter_predicate);
        // }
        // if (queryObject.predefined_search_predicate) {
        //   filters.$and.push(queryObject.predefined_search_predicate);
        // }

        // if (queryObject.s_filter) {
        //   filters.$and.push(queryObject.s_filter);
        // }
        // if (queryObject.c_filter) {
        //   filters.$and.push(queryObject.c_filter);
        // }
        setRows(Number(queryData.limit));
        setFirst(Number(queryData?.offset));
        setSortField(queryData?.sort[0]?.field);
        setSortOrder(queryData?.sort[0]?.order);
        // latestFiltersRef.current = filters;
        // setFilters(filters);

        const { sortField, sortOrder, rows, populate, populateMedia } = initialFilterMethod();
        setToPopulate(populate);
        setToPopulateMedia(populateMedia);

        setQueryDataLoaded(true);
      } else {
        const { sortField, sortOrder, rows, populate, populateMedia } = initialFilterMethod();
        setRows(rows);
        setSortField(sortField);
        setSortOrder(sortOrder);
        setQueryDataLoaded(true);
        setToPopulate(populate);
        setToPopulateMedia(populateMedia);
        setFirst(0);
      }
      setSelectedRecords([]);
      setSelectedRecoverRecords([]);
    }
  }, [
    isDeleteSolidEntitiesSucess,
    isDeleteSolidSingleEntitySuccess,
    recoverByIdIsSuccess,
    recoverByIsSuccess,
    solidListViewMetaData,
    solidListViewLayout
  ]);

  useEffect(() => {
    if (solidListViewMetaData && solidListViewMetaData?.data && !loading) {
      const handleDynamicFunction = async () => {
        const dynamicHeader = solidListViewMetaData?.data?.solidView?.layout?.onListLoad;
        let dynamicExtensionFunction = null;
        let listViewRecords = listViewData;
        let listLayout = solidListViewMetaData?.data?.solidView?.layout;
        if (params.customLayout) {
          listLayout = params.customLayout;
        }
        const event: SolidLoadList = {
          fieldsMetadata: solidListViewMetaData?.data?.solidFieldsMetadata,
          listData: listViewData,
          totalRecords: totalRecords,
          type: "onListLoad",
          viewMetadata: solidListViewMetaData?.data?.solidView,
          listViewLayout: listLayout,
          queryParams: {
            menuItemId: menuItemId,
            menuItemName: menuItemName,
            actionId: actionId,
            actionName: actionName,
          },
          user: user,
          session: session.data,
          params: params
        };

        if (dynamicHeader) {
          dynamicExtensionFunction = getExtensionFunction(dynamicHeader);
          if (dynamicExtensionFunction) {
            const updatedListData: SolidListUiEventResponse = await dynamicExtensionFunction(event);

            if (updatedListData && updatedListData?.dataChanged && updatedListData?.newListData) {
              listViewRecords = updatedListData.newListData;
            }
            if (updatedListData && updatedListData?.layoutChanged && updatedListData?.newLayout) {
              listLayout = updatedListData.newLayout;
            }
          }
          if (listViewRecords) {
            setListViewData(listViewRecords);
          }
          if (listLayout) {
            setSolidListViewLayout(listLayout);
          }
        }
      };
      handleDynamicFunction();
    }
  }, [solidListViewMetaData, loading]);



  // Create a ref that always has the latest filters
  const latestFiltersRef = useRef(filters);
  const latestCustomFilterRef = useRef(customFilter);

  // Keep refs in sync
  useEffect(() => {
    latestFiltersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    latestCustomFilterRef.current = customFilter;
  }, [customFilter]);


  useEffect(() => {
    console.log(`useEffect: [first- ${first}, rows- ${rows}, sortField- ${sortField}, sortOrder- ${sortOrder}, showArchived- ${showArchived}, toPopulate- ${toPopulate}, toPopulateMedia- ${toPopulateMedia}, queryDataLoaded- ${queryDataLoaded}]`);
    if (queryDataLoaded && filters) {
      setQueryString();
    }
  }, [
    first,
    rows,
    sortField,
    sortOrder,
    filters,
    showArchived,
    toPopulate,
    toPopulateMedia,
    queryDataLoaded
  ]);

  // Handle pagination event.
  const onPageChange = (event: any) => {
    setFirst(event.first);
    setRows(event.rows);
  };

  // Handle sort event.
  const onSort = (event: DataTableStateEvent) => {
    const { sortField, sortOrder } = event;
    const validSortOrder = sortOrder === 1 || sortOrder === -1 ? sortOrder : 0;
    setSortField(sortField);
    setSortOrder(validSortOrder);
    setFirst(0);

  };

  // handle change in the records which are currently selected...
  const onSelectionChange = (event: any) => {
    const value = event.value;
    const activeRecords = value.filter(
      (record: any) => record.deletedAt === null
    );
    const deletedRecords = value.filter(
      (record: any) => record.deletedAt !== null
    );

    setSelectedRecords(activeRecords);
    setSelectedRecoverRecords(deletedRecords);
  };



  const setQueryString = async () => {
    const solidFieldsMetadata =
      solidListViewMetaData?.data?.solidFieldsMetadata;

    let queryData: any = {
      offset: first,
      limit: rows,
      filters: latestFiltersRef.current ?? latestFiltersRef.current,
      populate: toPopulate,
      populateMedia: toPopulateMedia,
      locale: localeName ? localeName : "en",
    };



    if (sortField && solidFieldsMetadata && solidFieldsMetadata[sortField]) {
      const sortFieldMetadata = solidFieldsMetadata[sortField];
      if (
        sortFieldMetadata?.type === "relation" &&
        sortFieldMetadata?.relationType === "many-to-one"
      ) {
        sortField = `${sortField}.${sortFieldMetadata?.relationModel?.userKeyField?.name}`;
      }
      queryData.sort = [
        `${sortField}:${sortOrder == 0 ? null : sortOrder == 1 ? "asc" : "desc"
        }`,
      ];
    } else {
      queryData.sort = [`id:desc`];
    }

    if (showArchived) {
      queryData.showSoftDeleted = "inclusive";
    }

    //  SolidBeforeListDataLoad Event that allows filter modification just before api call 
    const dynamicHeader = solidListViewMetaData?.data?.solidView?.layout?.onBeforeListDataLoad;
    let dynamicExtensionFunction = null;
    const event: SolidBeforeListDataLoad = {
      type: "onBeforeListDataLoad",
      fieldsMetadata: solidListViewMetaData?.data?.solidFieldsMetadata,
      viewMetadata: solidListViewMetaData?.data?.solidView,
      listViewLayout: solidListViewMetaData?.data.solidView.layout,
      filter: structuredClone(queryData),
      queryParams: {
        menuItemId: menuItemId,
        menuItemName: menuItemName,
        actionId: actionId,
        actionName: actionName,
      },
      user: user,
      session: session.data,
      params: params
    };

    if (dynamicHeader) {
      dynamicExtensionFunction = getExtensionFunction(dynamicHeader);
      if (dynamicExtensionFunction) {
        try {
          const updatedListData: SolidListUiEventResponse = await dynamicExtensionFunction(event);
          if (updatedListData && updatedListData?.filterApplied && updatedListData?.newFilter) {
            queryData = updatedListData?.newFilter;
          }
        } catch (err) {
          console.error("Error executing onBeforeListDataLoad extension:", err);
        }
      }
    }

    const queryString = qs.stringify(queryData, { encodeValuesOnly: true });

    if (latestCustomFilterRef.current) {
      let url;
      const urlData = structuredClone(queryData);
      delete urlData.filters;
      urlData.custom_filter_predicate = latestCustomFilterRef.current.custom_filter_predicate || null;
      urlData.search_predicate = latestCustomFilterRef.current.search_predicate || null;

      queryObjectToQueryString(urlData);
    }
    triggerGetSolidEntities(queryString);
  };

  // handle filter...
  const handleApplyCustomFilter = (transformedFilter: any) => {
    const queryfilter = params.customFilter || {
      $and: [],
    };

    // custom_filter_predicate
    // search_predicate
    // saved_filter_predicate
    // predefined_search_predicate
    if (transformedFilter.custom_filter_predicate) {
      queryfilter.$and.push(transformedFilter.custom_filter_predicate);
    }
    if (transformedFilter.search_predicate) {
      queryfilter.$and.push(transformedFilter.search_predicate);
    }
    if (transformedFilter.saved_filter_predicate) {
      queryfilter.$and.push(transformedFilter.saved_filter_predicate);
    }
    if (transformedFilter.predefined_search_predicate) {
      queryfilter.$and.push(transformedFilter.predefined_search_predicate);
    }

    const customFilter = transformedFilter;
    const updatedFilter = { ...(filters || {}), ...(queryfilter || {}) };

    // Update refs IMMEDIATELY (synchronously)
    latestFiltersRef.current = updatedFilter;
    latestCustomFilterRef.current = transformedFilter;

    // Then update state
    setFilters(updatedFilter);
    setCustomFilter(transformedFilter);


    // Force synchronous state updates


  };

  // clear Filter
  const clearFilter = () => {
    if (solidListViewMetaData) {
      const { sortField, sortOrder, rows, populate, populateMedia } = initialFilterMethod();
      setRows(rows);
      setSortField(sortField);
      setSortOrder(sortOrder);
      setToPopulate(populate);
      setToPopulateMedia(populateMedia);
    }
    latestFiltersRef.current = {
      $and: []
    };


    setFilters({
      $and: []
    });
    solidGlobalSearchElementRef.current.clearFilter();
  };

  const [selectedSolidViewData, setSelectedSolidViewData] = useState<any>();
  const selectedDataRef = useRef<any>();
  const op = useRef(null);
  const [deleteEntity, setDeleteEntity] = useState(false);

  // clickable link allowing one to open the detail / form view.
  const detailsBodyTemplate = (solidViewData: any) => {
    return (
      <div>
        <Button
          type="button"
          text
          size="small"
          className=""
          onClick={(e) =>
          // @ts-ignore
          {
            e.stopPropagation();
            selectedDataRef.current = solidViewData;
            setSelectedSolidViewData(solidViewData);
            op.current.toggle(e)
          }
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="3"
            height="10"
            viewBox="0 0 4 16"
            fill="none"
          >
            <path
              d="M4 14C4 14.55 3.80417 15.0208 3.4125 15.4125C3.02083 15.8042 2.55 16 2 16C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14C0 13.45 0.195833 12.9792 0.5875 12.5875C0.979167 12.1958 1.45 12 2 12C2.55 12 3.02083 12.1958 3.4125 12.5875C3.80417 12.9792 4 13.45 4 14ZM4 8C4 8.55 3.80417 9.02083 3.4125 9.4125C3.02083 9.80417 2.55 10 2 10C1.45 10 0.979167 9.80417 0.5875 9.4125C0.195833 9.02083 0 8.55 0 8C0 7.45 0.195833 6.97917 0.5875 6.5875C0.979167 6.19583 1.45 6 2 6C2.55 6 3.02083 6.19583 3.4125 6.5875C3.80417 6.97917 4 7.45 4 8ZM4 2C4 2.55 3.80417 3.02083 3.4125 3.4125C3.02083 3.80417 2.55 4 2 4C1.45 4 0.979167 3.80417 0.5875 3.4125C0.195833 3.02083 0 2.55 0 2C0 1.45 0.195833 0.979166 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0C2.55 0 3.02083 0.195833 3.4125 0.5875C3.80417 0.979166 4 1.45 4 2Z"
              fill="#666666"
            />
          </svg>
        </Button>
      </div>
      // <a onClick={() => {
      //   if (params.embeded == true) {
      //     params.handlePopUpOpen(solidViewData.id);
      //   } else {
      //     router.push(`${editButtonUrl}/${solidViewData.id}`)
      //   }
      // }} rel="noopener noreferrer" className="text-sm font-bold p-0" style={{ color: "#12415D" }}>
      //   <i className="pi pi-pencil" style={{ fontSize: "1rem" }}></i>
      // </a>
    );
  };

  // Recover functions
  const recoverById = (id) => {
    triggerRecoverSolidEntitiesById(id);
  };

  const recoverAll = () => {
    let recoverList: any = [];
    selectedRecoverRecords.forEach((element: any) => {
      recoverList.push(element.id);
    });
    triggerRecoverSolidEntities(recoverList);
    setRecoverDialogVisible(false);
  };

  useEffect(() => {
    if (recoverByIdIsSuccess && recoverByIdData) {
      toast.current?.show({
        severity: "success",
        summary: "Success",
        detail: recoverByIdData.data.message,
        life: 3000,
      });
      return;
    }
    if (recoverByIdIsError && recoverByIdError) {
      showError(recoverByIdError);
      return;
    }

    if (recoverIsError && recoverError) {
      showError(recoverError);
    }
  }, [recoverByIdIsSuccess, recoverByIdData, recoverByIdIsError, recoverByIdError, recoverIsError, recoverError]);

  const showError = async (error) => {
    const errorMessages = error?.data?.message;
    const messages = Array.isArray(errorMessages)
      ? errorMessages
      : errorMessages
        ? [errorMessages]
        : [];
    if (messages.length > 0) {
      toast?.current?.show({
        severity: "error",
        summary: ERROR_MESSAGES.SEND_REPORT,
        sticky: true,
        //@ts-ignore
        content: (props) => (
          <div
            className="flex flex-column align-items-left"
            style={{ flex: "1" }}
          >
            {messages.map((m, index) => (
              <div className="flex align-items-center gap-2" key={index}>
                <span className="font-bold text-900">{String(m)}</span>
              </div>
            ))}
          </div>
        ),
      });
    }
  };

  const showFieldError = async (error) => {
    if (error) {
      toast?.current?.show({
        severity: "error",
        summary: ERROR_MESSAGES.SEND_REPORT,
        // sticky: true,
        life: 3000,
        //@ts-ignore
        content: (props) => (
          <div
            className="flex flex-column align-items-left"
            style={{ flex: "1" }}
          >
            <div className="flex align-items-center gap-2">
              <span className="font-bold text-900">{String(error)}</span>
            </div>
          </div>
        ),
      });
    }
  };

  // handle bulk deletion
  const deleteBulk = () => {
    let deleteList: any = [];
    selectedRecords.forEach((element: any) => {
      deleteList.push(element.id);
    });
    deleteManySolidEntities(deleteList)
      .unwrap()
      .then(() => {
        toast.current?.show({
          severity: 'success',
          summary: 'Deleted',
          detail: ERROR_MESSAGES.RECORD_DELETE,
          life: 3000
        });
        setDialogVisible(false);
      })
      .catch((error) => {
        toast.current?.show({
          severity: 'error',
          summary: 'Delete Failed',
          detail: error?.data?.message,
          life: 4000
        });
      });
  };

  // handle closing of the delete dialog...
  const onDeleteClose = () => {
    setDialogVisible(false);
    setSelectedRecords([]);
    setSelectedRecoverRecords([]);
  };

  const [openLightbox, setOpenLightbox] = useState(false);
  const [lightboxUrls, setLightboxUrls] = useState({});
  const [showGlobalSearchElement, setShowGlobalSearchElement] = useState(false);

  // Render columns dynamically based on metadata
  const renderColumnsDynamically = (solidListViewMetaData: any, solidListViewLayout: any) => {
    if (!solidListViewMetaData) {
      return;
    }
    if (!solidListViewMetaData.data) {
      return;
    }
    const solidView = solidListViewMetaData.data.solidView;
    const solidFieldsMetadata = solidListViewMetaData.data.solidFieldsMetadata;
    if (!solidView || !solidFieldsMetadata) {
      return;
    }
    const currentLayout = solidListViewLayout;

    return currentLayout.children?.map((column: any) => {
      const fieldMetadata = solidFieldsMetadata[column.attrs.name];
      if (!fieldMetadata) {
        return;
      }
      const visibleToRole = column?.attrs?.roles || [];

      if (visibleToRole.length > 0) {
        if (hasAnyRole(user?.roles, visibleToRole)) {
          return SolidListViewColumn({
            solidListViewMetaData,
            fieldMetadata,
            column,
            setLightboxUrls,
            setOpenLightbox,
          });
        } else {
          return null;
        }
      } else {
        return SolidListViewColumn({
          solidListViewMetaData,
          fieldMetadata,
          column,
          setLightboxUrls,
          setOpenLightbox,
        });
      }
    });
  };

  //Note -  Custom Row Action Popup
  const closeListViewRowActionPopup = () => {
    setListViewRowActionPopupState(false);
  };

  // if (loading || isLoading) {
  //   return <SolidListViewShimmerLoading />;
  // }

  const viewMode = searchParams.get("viewMode");

  // if (
  //   (loading || isLoading) && params.embeded == false && viewMode !== "view"
  // ) {
  //   return <SolidListViewShimmerLoading />;
  // }

  const isListViewEmptyWithoutFilters =
    !loading &&
    (!filters || Object.keys(filters).length === 0) &&
    listViewData.length === 0;

  // if (isListViewEmptyWithoutFilters) {
  //   return (
  //     <SolidEmptyListViewPlaceholder
  //       createButtonUrl={createButtonUrl}
  //       actionsAllowed={actionsAllowed}
  //       params={params}
  //       solidListViewMetaData={solidListViewMetaData}
  //     />
  //   );
  // }

  const handleFetchUpdatedRecords = () => {
    setQueryString();
  };
  const handleOpenSolidXAIPanel = () => {
    setIsOpenSolidXAiPanel(true);
    localStorage.setItem("l_solidxai_open", "true");
  };

  const handleCloseSolidXAIPanel = () => {
    setIsOpenSolidXAiPanel(false);
    localStorage.setItem("l_solidxai_open", "false");
  };

  const handleDeleteEntity = async () => {
    try {
      if (!selectedSolidViewData?.id) {
        throw new Error(ERROR_MESSAGES.NO_ENTITY_SELECTED);
      }

      const response = await deleteSolidSingleEntiry(selectedSolidViewData.id);

      if (response?.data?.statusCode === 200) {
        setDeleteEntity(false);
        toast.current?.show({
          severity: "success",
          summary: ERROR_MESSAGES.DELETED,
          detail: ERROR_MESSAGES.ENTITY_DELETE,
          ...(severity === "error"
            ? { sticky: true }            // stays until user closes
            : { life: 3000 }),
        });
      } else {
        toast.current?.show({
          severity: "error",
          summary: ERROR_MESSAGES.DELETE_FAIELD,
          detail: response?.error?.data?.error,
          ...(severity === "error"
            ? { sticky: true }            // stays until user closes
            : { life: 3000 }),
        });
      }
    } catch (error: any) {
      toast.current?.show({
        severity: "error",
        summary: ERROR_MESSAGES.DELETE_FAIELD,
        detail: ERROR_MESSAGES.SOMETHING_WRONG,
        ...(severity === "error"
          ? { sticky: true }            // stays until user closes
          : { life: 3000 }),
      });
    }
  };

  const isVideoOrAudio = (url: string) => {
    // Remove query params if present
    const cleanUrl = url.split("?")[0];
    const ext = cleanUrl.split(".").pop()?.toLowerCase();

    const mediaExt = ["mp4", "webm", "ogg", "mov", "mp3", "wav", "m4a", "aac"];

    return ext ? mediaExt.includes(ext) : false;
  };

  const controlsList = ["nodownload", "nofullscreen", "noremoteplayback"];

  const slides = Array.isArray(lightboxUrls)
    ? lightboxUrls.map((item: any) => {
      const url = item?.src || item?.downloadUrl || "";
      if (isVideoOrAudio(url)) {
        return {
          type: "video" as const,
          sources: [{ src: url, type: "video/mp4" }],
        };
      }
      return { src: url };
    })
    : [];

  const hasMedia = slides.some((s) => (s as any).type === "video");

  const hasEditInContextMenu = actionsAllowed.includes(`${permissionExpression(params.modelName, 'update')}`) &&
    solidListViewLayout?.attrs?.edit !== false &&
    solidListViewLayout?.attrs?.showDefaultEditButton !== false &&
    solidListViewLayout?.attrs?.showRowEditInContextMenu !== false &&
    !(isDraftPublishWorkflowEnabled && selectedDataRef.current?.publishedAt);

  const hasDeleteInContextMenu = actionsAllowed.includes(`${permissionExpression(params.modelName, 'delete')}`) &&
    solidListViewLayout?.attrs?.delete !== false &&
    solidListViewLayout?.attrs?.showRowDeleteInContextMenu !== false &&
    !(isDraftPublishWorkflowEnabled && selectedDataRef.current?.publishedAt);

  const hasCustomContextMenuButtons =
    solidListViewLayout?.attrs?.rowButtons?.some(
      (rb) => rb?.attrs?.actionInContextMenu === true
    );

  const hasAnyContextMenuActions =
    hasEditInContextMenu || hasDeleteInContextMenu || hasCustomContextMenuButtons;

  const toggleBothSidebars = () => {
    if (visibleNavbar) {
      dispatch(toggleNavbar());   // close both
    } else {
      dispatch(showNavbar());     // open both
    }
  };
  return (
    <div className="page-parent-wrapper flex">
      <div className={`h-full flex-grow-1 ${styles.ListContentWrapper}`}>
        {solidListViewInitialMetaData && queryDataLoaded &&
          <div className="page-header flex-column lg:flex-row">
            <Toast ref={toast} />
            {/* <div> */}
            <div className="flex justify-content-between w-full">
              <div className="flex gap-3 align-items-center w-full ">
                <div className='flex align-items-center gap-2'>
                  {params.embeded !== true &&
                    <div className="apps-icon block md:hidden cursor-pointer" onClick={toggleBothSidebars}>
                      <i className="pi pi-th-large"></i>
                    </div>
                  }
                  <p className="m-0 view-title solid-text-wrapper">
                    {solidListViewMetaData?.data?.solidView?.action?.displayName || solidListViewMetaData?.data?.solidView?.displayName}
                  </p>
                </div>
                {solidListViewLayout?.attrs?.enableGlobalSearch === true &&
                  params.embeded === false && (
                    <div className="hidden lg:flex">
                      <SolidGlobalSearchElement
                        showSaveFilterPopup={showSaveFilterPopup}
                        setShowSaveFilterPopup={setShowSaveFilterPopup}
                        filters={filters}
                        clearFilter={clearFilter}
                        ref={solidGlobalSearchElementRef}
                        viewData={solidListViewMetaData}
                        handleApplyCustomFilter={handleApplyCustomFilter}>
                      </SolidGlobalSearchElement>
                    </div>

                  )}

              </div>
              <div className="flex align-items-center solid-header-buttons-wrapper">
                {solidListViewLayout?.attrs?.enableGlobalSearch === true &&
                  params.embeded === false && (
                    <div className="flex lg:hidden">
                      <Button
                        type="button"
                        size="small"
                        icon="pi pi-search"
                        severity="secondary"
                        outlined
                        className="solid-icon-button"
                        onClick={() => setShowGlobalSearchElement(!showGlobalSearchElement)}
                      >
                      </Button>
                    </div>

                  )}

                <div className="hidden lg:flex align-items-center solid-header-buttons-wrapper">
                  {solidListViewLayout?.attrs?.headerButtons
                    ?.filter((rb) => rb.attrs.actionInContextMenu != true)
                    ?.map((button: any, index: number) => (
                      <SolidListViewHeaderButton
                        key={index}
                        button={button}
                        params={params}
                        solidListViewMetaData={solidListViewMetaData}
                        handleCustomButtonClick={handleCustomButtonClick}
                        selectedRecords={selectedRecords}
                        filters={filters}
                      />
                    ))}
                </div>

                {actionsAllowed.includes(`${permissionExpression(params.modelName, 'create')}`) &&
                  solidListViewLayout?.attrs?.create !== false &&
                  params.embeded !== true &&
                  solidListViewMetaData?.data?.solidView?.layout?.attrs
                    .showDefaultAddButton !== false && (
                    <SolidCreateButton
                      createButtonUrl={createButtonUrl}
                      createActionQueryParams={createActionQueryParams}
                      solidListViewLayout={solidListViewLayout}
                      responsiveIconOnly={true}
                    />
                  )}
                {actionsAllowed.includes(`${permissionExpression(params.modelName, 'create')}`) &&
                  solidListViewLayout?.attrs?.create !== false &&
                  params.embeded == true &&
                  params.inlineCreate == true &&
                  searchParams.get("viewMode") !== "view" && (

                    <Button
                      type="button"
                      icon={solidListViewLayout?.attrs?.addButtonIcon ? solidListViewLayout?.attrs?.addButtonIcon : "pi pi-plus"}
                      label={solidListViewLayout?.attrs?.addButtonTitle ? solidListViewLayout?.attrs?.addButtonTitle : "Add"}
                      className={`${solidListViewLayout?.attrs?.addButtonClassName}`}
                      size="small"
                      onClick={() => params.handlePopUpOpen("new")}
                    ></Button>
                  )}
                {/* Button For Manual Refresh */}
                {params.embeded !== true && (
                  <Button
                    type="button"
                    size="small"
                    icon="pi pi-refresh"
                    severity="secondary"
                    className="solid-icon-button "
                    outlined
                    onClick={() => {
                      setQueryString();
                    }}
                  />
                )}
                {showArchived && (
                  <Button
                    type="button"
                    icon="pi pi-refresh"
                    label="Recover"
                    size="small"
                    severity="secondary"
                    className="hidden lg:flex solid-icon-button "
                    onClick={() => setRecoverDialogVisible(true)}
                  ></Button>
                )}

                {params.embeded === false &&
                  solidListViewLayout?.attrs?.configureView !== false && (
                    <SolidListViewConfigure
                      listViewMetaData={solidListViewMetaData}
                      solidListViewLayout={solidListViewLayout}
                      setShowArchived={setShowArchived}
                      showArchived={showArchived}
                      viewData={solidListViewMetaData}
                      sizeOptions={sizeOptions}
                      setSize={setSize}
                      size={size}
                      viewModes={viewModes}
                      params={params}
                      actionsAllowed={actionsAllowed}
                      selectedRecords={selectedRecords}
                      setDialogVisible={setDialogVisible}
                      setShowSaveFilterPopup={setShowSaveFilterPopup}
                      filters={filters}
                      handleFetchUpdatedRecords={handleFetchUpdatedRecords}
                      setRecoverDialogVisible={setRecoverDialogVisible}
                    />
                  )}
              </div>
            </div>
            {/* </div> */}
            {solidListViewLayout?.attrs?.enableGlobalSearch === true && showGlobalSearchElement &&
              params.embeded === false && (
                <div className="flex lg:hidden">
                  <SolidGlobalSearchElement
                    showSaveFilterPopup={showSaveFilterPopup}
                    setShowSaveFilterPopup={setShowSaveFilterPopup}
                    filters={filters}
                    clearFilter={clearFilter}
                    ref={solidGlobalSearchElementRef}
                    viewData={solidListViewMetaData}
                    handleApplyCustomFilter={handleApplyCustomFilter}>
                  </SolidGlobalSearchElement>
                </div>

              )}
            {/* <Dialog
            visible={showGlobalSearchElement}
            // header="Confirm Delete"
            onHide={() => setShowGlobalSearchElement(false)}
            headerClassName="py-2"
            contentClassName="px-0 pb-0"
            // style={{ width: '20vw' }}
            style={{height:'50vw'}}
            breakpoints={{ '1199px': '20vw', '1024px': '30vw', '767px': '90vw', '250px': '80vw' }}
          >
            <SolidGlobalSearchElement
              showSaveFilterPopup={showSaveFilterPopup}
              setShowSaveFilterPopup={setShowSaveFilterPopup}
              filters={filters}
              clearFilter={clearFilter}
              ref={solidGlobalSearchElementRef}
              viewData={solidListViewMetaData}
              handleApplyCustomFilter={handleApplyCustomFilter}>
            </SolidGlobalSearchElement>
          </Dialog> */}
          </div>
        }

        {(loading || isLoading) && params.embeded == false && viewMode !== "view" ?
          < SolidListViewShimmerLoading />
          :
          <>
            {isListViewEmptyWithoutFilters ? (
              <SolidEmptyListViewPlaceholder
                createButtonUrl={createButtonUrl}
                createActionQueryParams={createActionQueryParams}
                actionsAllowed={actionsAllowed}
                params={params}
                solidListViewMetaData={solidListViewMetaData}
              />

            ) : (
              <div className="solid-datatable-wrapper flex-1 min-h-0 overflow-auto">
                <DataTable
                  value={listViewData}
                  rowClassName={(rowData) => {
                    return rowData.deletedAt ? "greyed-out-row" : "";
                  }}
                  showGridlines={false}
                  lazy
                  scrollable
                  // scrollHeight="90vh"
                  size={size}
                  resizableColumns
                  columnResizeMode="expand"
                  paginator={true}
                  rows={rows}
                  rowsPerPageOptions={solidListViewLayout?.attrs?.pageSizeOptions}
                  dataKey="id"
                  emptyMessage={
                    solidListViewMetaData?.data?.solidView?.model?.description ||
                    "No Entities found"
                  }
                  filterDisplay="menu"
                  totalRecords={totalRecords}
                  first={first}
                  onPage={onPageChange}
                  onSort={(e: DataTableStateEvent) => onSort(e)}
                  sortField={sortField}
                  sortOrder={sortOrder === 1 || sortOrder === -1 ? sortOrder : 0}
                  loading={false}
                  // loading={loading || isLoading}
                  // loadingIcon="pi pi-spinner"
                  selection={
                    params.embeded === true
                      ? null
                      : [...selectedRecords, ...selectedRecoverRecords]
                  }
                  onSelectionChange={
                    params.embeded === true ? undefined : onSelectionChange
                  }
                  selectionMode={params.embeded === true ? null : "checkbox"}
                  removableSort
                  filterIcon={<FilterIcon />}
                  tableClassName="solid-data-table"
                  paginatorClassName="solid-paginator"
                  paginatorTemplate="RowsPerPageDropdown CurrentPageReport PrevPageLink NextPageLink"
                  currentPageReportTemplate="{first} - {last} of {totalRecords}"
                  onRowClick={(e) => {
                    const rowData = e.data;

                    if (solidListViewLayout?.attrs?.disableRowClick === true) return;

                    const hasFindPermission = actionsAllowed.includes(
                      permissionExpression(params.modelName, 'findOne')
                    );
                    const hasUpdatePermission =
                      actionsAllowed.includes(permissionExpression(params.modelName, 'update')) &&
                      solidListViewLayout?.attrs?.edit !== false;

                    if (!(hasFindPermission || hasUpdatePermission)) return;

                    if (params.embeded === true) {
                      params.handlePopUpOpen(rowData?.id);
                    } else {
                      if (typeof window !== "undefined") {
                        // store a simple marker for the caller

                        // also store the full current URL so Back can restore exact state (including action params)
                        try {
                          sessionStorage.setItem("fromView", "list");
                          sessionStorage.setItem("fromViewUrl", window.location.pathname + window.location.search);
                        } catch (e) {
                          // ignore storage errors
                        }
                      }
                      router.push(`${editBaseUrl}/${rowData?.id}?viewMode=view&${new URLSearchParams(editActionQueryParams).toString()}`);
                    }
                  }
                  }
                >
                  {params.embeded === true ? null : (
                    <Column
                      selectionMode="multiple"
                      headerStyle={{ width: "3em" }}
                    />
                  )}
                  {solidListViewMetaData && solidListViewLayout && renderColumnsDynamically(solidListViewMetaData, solidListViewLayout)}
                  {solidListViewLayout?.attrs?.rowButtons &&
                    solidListViewLayout?.attrs?.rowButtons
                      .filter((rb: any) => {
                        const roles = rb?.attrs?.roles || [];
                        const isInContextMenu =
                          rb.attrs.actionInContextMenu === true;

                        // Only check hasAnyRole if roles are provided
                        const isAllowed =
                          roles.length === 0 ||
                          hasAnyRole(user?.roles, roles);

                        const isVisible = rb?.attrs?.visible !== false;

                        return !isInContextMenu && isAllowed && isVisible;
                      })
                      .map((button: any, index: number) => {

                        return (
                          <Column
                            key={index}
                            header={button.attrs.label}
                            body={(rowData) => {
                              return (
                                <Button
                                  type="button"
                                  icon={
                                    button?.attrs?.icon
                                      ? button?.attrs?.icon
                                      : "pi pi-pencil"
                                  }
                                  className={`w-full text-left gap-2 ${button?.attrs?.className
                                    ? button?.attrs?.className
                                    : ""
                                    }`}
                                  label={
                                    button.attrs.showLabel !== false
                                      ? button.attrs.label
                                      : ""
                                  }
                                  size="small"
                                  iconPos="left"
                                  onClick={() => {
                                    const event = {
                                      params,
                                      rowData: rowData,
                                      solidListViewMetaData:
                                        solidListViewMetaData?.data,
                                    };
                                    handleCustomButtonClick(button.attrs, event);
                                  }}
                                />
                              );
                            }}
                          />
                        );
                      })}

                  {actionsAllowed.includes(
                    `${permissionExpression(params.modelName, 'update')}`
                  ) &&
                    solidListViewLayout?.attrs?.edit !== false &&
                    solidListViewLayout?.attrs?.showRowEditInContextMenu ===
                    false && (
                      <Column
                        header="Edit"
                        body={(rowData) => {
                          const shouldHideEditOrDeleteButton = isDraftPublishWorkflowEnabled && rowData?.publishedAt;
                          return (
                            <>
                              {!shouldHideEditOrDeleteButton && (
                                <Button
                                  text
                                  type="button"
                                  severity="secondary"
                                  className=""
                                  label=""
                                  size="small"
                                  iconPos="left"
                                  icon={"pi pi-pencil"}
                                  onClick={() => {
                                    if (params.embeded == true) {
                                      params.handlePopUpOpen(rowData?.id);
                                    } else {
                                      if (typeof window !== "undefined") {
                                        try {
                                          sessionStorage.setItem("fromView", "list");
                                          sessionStorage.setItem("fromViewUrl", window.location.pathname + window.location.search);
                                        } catch (e) { }
                                      }
                                      router.push(
                                        `${editBaseUrl}/${rowData?.id}?viewMode=edit&${new URLSearchParams(editActionQueryParams).toString()}`
                                      );
                                    }
                                  }}
                                />
                              )}
                            </>
                          );
                        }}
                      />
                    )}

                  {actionsAllowed.includes(
                    `${permissionExpression(params.modelName, 'delete')}`
                  ) &&
                    solidListViewLayout?.attrs?.delete !== false &&
                    solidListViewLayout?.attrs?.showRowDeleteInContextMenu ===
                    false && (
                      <Column
                        header="Delete"
                        body={(rowData) => {
                          const shouldHideEditOrDeleteButton = isDraftPublishWorkflowEnabled && rowData?.publishedAt;
                          return (
                            <>
                              {!shouldHideEditOrDeleteButton && (
                                <Button
                                  text
                                  type="button"
                                  className=""
                                  size="small"
                                  iconPos="left"
                                  severity="danger"
                                  icon={"pi pi-trash"}
                                  onClick={() => {
                                    setSelectedSolidViewData(rowData);
                                    setDeleteEntity(true);
                                  }}
                                />
                              )}
                            </>
                          );
                        }}
                      />
                    )}

                  {hasAnyContextMenuActions && (
                    <Column
                      frozen
                      alignFrozen="right"
                      body={(rowData) =>
                        rowData?.deletedAt ? (
                          <a
                            onClick={(event) => {
                              event.stopPropagation();
                              recoverById(rowData.id);
                            }}
                            className="retrieve-button"
                          >
                            <i
                              className="pi pi-refresh"
                              style={{ fontSize: "1rem" }}
                            />
                          </a>
                        ) : (
                          <>
                            {solidListViewLayout?.attrs?.showRowContextMenu !==
                              false && (
                                <>
                                  {detailsBodyTemplate(rowData)}
                                  <OverlayPanel
                                    ref={op}
                                    className="solid-custom-overlay"
                                    style={{ top: 10, minWidth: 120 }}
                                  >
                                    <div className="flex flex-column gap-1 p-1">
                                      {hasEditInContextMenu && (
                                        <Button
                                          type="button"
                                          className="w-full text-left gap-1"
                                          label="Edit"
                                          size="small"
                                          iconPos="left"
                                          icon={"pi pi-pencil"}
                                          onClick={() => {
                                            if (params.embeded == true) {
                                              params.handlePopUpOpen(
                                                selectedDataRef.current?.id
                                              );
                                            } else {
                                              try {
                                                sessionStorage.setItem("fromView", "list");
                                                sessionStorage.setItem("fromViewUrl", window.location.pathname + window.location.search);
                                              } catch (e) { }
                                              router.push(
                                                `${editBaseUrl}/${selectedDataRef.current?.id}?viewMode=edit&${new URLSearchParams(editActionQueryParams).toString()}`
                                              );
                                            }
                                          }}
                                        />
                                      )}

                                      {hasDeleteInContextMenu && (
                                        <Button
                                          text
                                          type="button"
                                          className="w-full text-left gap-1"
                                          label="Delete"
                                          size="small"
                                          iconPos="left"
                                          severity="danger"
                                          icon={"pi pi-trash"}
                                          onClick={() => setDeleteEntity(true)}
                                        />
                                      )}
                                      {hasCustomContextMenuButtons && solidListViewLayout?.attrs?.rowButtons
                                        ?.filter(
                                          (rb) =>
                                            rb?.attrs?.actionInContextMenu === true &&
                                            rb?.attrs?.visible !== false
                                        )
                                        .map((button: any, index: number) => (
                                          <SolidListViewRowButtonContextMenu
                                            key={`${index}-${selectedDataRef?.current?.id || ''}`}
                                            button={button}
                                            params={params}
                                            getSelectedSolidViewData={() => selectedDataRef.current}
                                            // selectedSolidViewData={selectedSolidViewData}
                                            solidListViewMetaData={
                                              solidListViewMetaData
                                            }
                                            handleCustomButtonClick={
                                              handleCustomButtonClick
                                            }
                                          />
                                        ))}
                                    </div>
                                  </OverlayPanel>
                                </>
                              )}
                          </>
                        )
                      }
                    ></Column>
                  )}
                </DataTable>
              </div>
            )}
          </>
        }
      </div>
      {
        mcpUrl &&
        params.embeded !== true && (
          <div
            className={`chatter-section ${isOpenSolidXAiPanel === false ? "collapsed" : "open"
              }`}
            style={{ width: chatterWidth }}
          >
            {isOpenSolidXAiPanel && (
              <div
                style={{
                  width: 5,
                  cursor: "col-resize",
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  height: "100%",
                  zIndex: 9,
                }}
                onMouseDown={() => setIsResizing(true)}
              />
            )}
            {isOpenSolidXAiPanel && (
              <Button
                icon="pi pi-angle-double-right"
                size="small"
                text
                className="chatter-collapse-btn"
                style={{ width: 30, height: 30, aspectRatio: "1/1" }}
                onClick={handleCloseSolidXAIPanel}
              />
            )}

            {isOpenSolidXAiPanel === false ? (
              <div className="flex flex-column gap-2 justify-content-center p-2">
                <div
                  className="chatter-collapsed-content"
                  onClick={handleOpenSolidXAIPanel}
                >
                  <div className="flex gap-2">
                    {" "}
                    <SolidXAIIcon /> SolidX AI{" "}
                  </div>
                </div>
                <Button
                  icon="pi pi-chevron-left"
                  size="small"
                  className="px-0"
                  style={{ width: 30 }}
                  onClick={handleOpenSolidXAIPanel}
                />
              </div>
            ) : (
              <SolidAiMainWrapper mcpUrl={mcpUrl} />
            )}
          </div>
        )
      }
      <Dialog
        visible={isDialogVisible}
        header="Confirm Delete"
        onHide={() => setDialogVisible(false)}
        headerClassName="py-2"
        contentClassName="px-0 pb-0"
        // style={{ width: '20vw' }}
        breakpoints={{ '1199px': '30rem', '550px': '85vw' }}
      >
        <Divider className="m-0" />
        <div className="p-4">
          <p className="m-0 solid-primary-title" style={{ fontSize: 16 }}>Are you sure you want to delete the selected records?</p>
          <div className="flex align-items-center gap-2 mt-3">
            <Button label="Delete" severity="danger" size="small" onClick={handleDeleteEntity} autoFocus onClick={deleteBulk} />
            <Button label="Cancel" size="small" onClick={onDeleteClose} outlined className='bg-primary-reverse' />
          </div>
        </div>
      </Dialog>
      <Dialog
        visible={isRecoverDialogVisible}
        header="Confirm Recover"
        modal
        className="solid-confirm-dialog"
        footer={() => (
          <div className="flex justify-content-center">
            <Button
              label="Yes"
              icon="pi pi-check"
              severity="danger"
              autoFocus
              onClick={recoverAll}
            />
            <Button
              label="No"
              icon="pi pi-times"
              onClick={() => setRecoverDialogVisible(false)}
            />
          </div>
        )}
        onHide={() => setRecoverDialogVisible(false)}
      >
        <p>Are you sure you want to recover all records?</p>
      </Dialog>

      {
        listViewRowActionData && (
          <Dialog
            visible={listViewRowActionPopupState}
            modal
            onHide={closeListViewRowActionPopup}
          >
            <ListViewRowActionPopup
              context={listViewRowActionData}
            ></ListViewRowActionPopup>
          </Dialog>
        )
      }
      <Dialog
        header={`Delete ${solidListViewMetaData?.data?.solidView?.model?.displayName
          ? solidListViewMetaData?.data?.solidView?.model?.displayName
          : params?.modelName
          }`}
        headerClassName="py-2"
        contentClassName="px-0 pb-0"
        visible={deleteEntity}
        style={{ width: "20vw" }}
        onHide={() => {
          if (!deleteEntity) return;
          setDeleteEntity(false);
        }}
        className="solid-confirm-dialog"
      >
        <Divider className="m-0" />
        <div className="p-4">
          <p className="m-0 solid-primary-title" style={{ fontSize: 16 }}>
            {`Are you sure you want to delete this ${solidListViewMetaData?.data?.solidView?.model?.displayName
              ? solidListViewMetaData?.data?.solidView?.model?.displayName
              : params?.modelName
              }?`}
          </p>
          {/* <p className="" style={{ color: 'var{--solid-grey-500}' }}>{selectedSolidViewData?.singularName}</p> */}
          <div className="flex align-items-center gap-2 mt-3">
            <Button label="Delete" severity="danger" size="small" onClick={handleDeleteEntity} />
            <Button label="Cancel" size="small" onClick={() => setDeleteEntity(false)} outlined className='bg-primary-reverse' />
          </div>
        </div>
      </Dialog>
      {
        openLightbox && (
          <Lightbox
            open={openLightbox}
            plugins={
              hasMedia
                ? [Counter, Download, Video] // add Video plugin if needed
                : [Counter, Download]
            }
            close={() => setOpenLightbox(false)}
            slides={[...slides]}
            {...(hasMedia && {
              video: {
                controls: true,
                playsInline: true,
                autoPlay: false,
                loop: false,
                muted: false,
                disablePictureInPicture: false,
                disableRemotePlayback: false,
                controlsList: controlsList.join(" "),
                crossOrigin: "anonymous",
                preload: "auto",
              },
            })}
          />
        )
      }
    </div >
  );
};
