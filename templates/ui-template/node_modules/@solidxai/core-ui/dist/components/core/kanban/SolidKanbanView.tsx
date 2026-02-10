import { permissionExpression } from "../../../helpers/permissions";
import { createSolidEntityApi } from "../../../redux/api/solidEntityApi";
import { useGetSolidViewLayoutQuery } from "../../../redux/api/solidViewApi";
import { useLazyCheckIfPermissionExistsQuery } from "../../../redux/api/userApi";
import { DropResult } from "@hello-pangea/dnd";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import qs from "qs";
import { useEffect, useRef, useState } from "react";
import { SolidCreateButton } from "../common/SolidCreateButton";
import { SolidGlobalSearchElement } from "../common/SolidGlobalSearchElement";
import KanbanBoard from "./KanbanBoard";
import CompactImage from '../../../resources/images/layout/images/compact.png';
import CozyImage from '../../../resources/images/layout/images/cozy.png';
import ComfortableImage from '../../../resources/images/layout/images/comfortable.png';
import { capitalize } from "lodash";
import Lightbox from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Download from "yet-another-react-lightbox/plugins/download";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";
import { useRouter } from "../../../hooks/useRouter";
import { SolidKanbanViewConfigure } from "./SolidKanbanViewConfigure";
import { KanbanUserViewLayout } from "./KanbanUserViewLayout";
import { useDispatch, useSelector } from "react-redux";
import { queryObjectToQueryString, queryStringToQueryObject } from "../list/SolidListView";
import { Toast } from "primereact/toast";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import { showNavbar, toggleNavbar } from "../../../redux/features/navbarSlice";
import { normalizeSolidListKanbanActionPath } from "../../../helpers/routePaths";
import showToast from "../../../helpers/showToast";


type SolidKanbanViewParams = {
  moduleName: string;
  modelName: string;
  embeded: boolean;
};


export const SolidKanbanView = (params: SolidKanbanViewParams) => {

  const visibleNavbar = useSelector((state: any) => state.navbarState?.visibleNavbar);
  const dispatch = useDispatch()

  const solidGlobalSearchElementRef = useRef();
  const router = useRouter();
  // TODO: The initial filter state will be created based on the fields which are present on this kanban view. 
  const [filters, setFilters] = useState<any>();
  const [toPopulate, setToPopulate] = useState<string[]>([]);
  const [toPopulateMedia, setToPopulateMedia] = useState<string[]>([]);
  const [actionsAllowed, setActionsAllowed] = useState<string[]>([]);
  const [showGlobalSearchElement, setShowGlobalSearchElement] = useState<boolean>(false);
  const [showArchived, setShowArchived] = useState(false);
  const sizeOptions = [
    { label: 'Compact', value: 'small', image: CompactImage },
    { label: 'Cozy', value: 'normal', image: CozyImage },
    { label: 'Comfortable', value: 'large', image: ComfortableImage }
  ]
  const [size, setSize] = useState<string | any>(sizeOptions[1].value);
  const [viewModes, setViewModes] = useState<any>([]);
  const [groupByFieldName, setGroupByFieldName] = useState<string>("");
  const [groupedView, setGroupedView] = useState(true);
  const [triggerCheckIfPermissionExists] = useLazyCheckIfPermissionExistsQuery();
  const [openLightbox, setOpenLightbox] = useState(false);
  const [lightboxUrls, setLightboxUrls] = useState({});
  const [filterQueryString, setFilterQueryString] = useState<any>();
  const [isLayoutDialogVisible, setLayoutDialogVisible] = useState(false);
  const toast = useRef<Toast>(null);

  const pushFiltersToRouter = (filterQueryString: any) => {
    // @ts-ignore
    router.push(`?${filterQueryString}`, undefined, { shallow: true });
  };

  useEffect(() => {
    if (filterQueryString) {
      pushFiltersToRouter(filterQueryString);
    }
  }, [filterQueryString]);



  useEffect(() => {
    const fetchPermissions = async () => {
      if (params.modelName) {
        const permissionNames = [
          permissionExpression(params.modelName, 'create'),
          permissionExpression(params.modelName, 'delete'),
          permissionExpression(params.modelName, 'update')
        ]
        const queryData = {
          permissionNames: permissionNames
        };
        const queryString = qs.stringify(queryData, {
          encodeValuesOnly: true
        });
        const response = await triggerCheckIfPermissionExists(queryString);
        setActionsAllowed(response.data.data);
      }
    };
    fetchPermissions();
  }, [params.modelName]);


  // Create the RTK slices for this entity
  const entityApi = createSolidEntityApi(params.modelName);
  const {
    useDeleteMultipleSolidEntitiesMutation,
    useLazyGetSolidEntitiesQuery,
    usePatchUpdateSolidEntityMutation
  } = entityApi;

  // Get the kanban view layout & metadata first. 
  const kanbanViewMetaDataQs = qs.stringify({ ...params, viewType: 'kanban' }, {
    encodeValuesOnly: true,
  });
  const [kanbanViewMetaData, setKanbanViewMetaData] = useState<any>({});

  const {
    data: solidKanbanViewMetaData  } = useGetSolidViewLayoutQuery(kanbanViewMetaDataQs);



  const initialFilterMethod = () => {

    const solidView = solidKanbanViewMetaData.data.solidView;
    const solidFieldsMetadata = solidKanbanViewMetaData.data.solidFieldsMetadata;

    const initialFilters: any = {};
    const toPopulate: string[] = [];
    const toPopulateMedia: string[] = [];
    function extractFields(node: any, result: any = []) {
      if (node.type === "field") {
        result.push(node);
      }
      if (node.children) {
        node.children.forEach((child: any) => extractFields(child, result));
      }
      return result;
    }

    const layoutFields = extractFields(solidView.layout);

    for (let i = 0; i < layoutFields.length; i++) {
      const column = layoutFields[i];
      const fieldMetadata = solidFieldsMetadata[column.attrs.name];
      if (fieldMetadata) {

        // Form the initial filters after iterating over the columns and field metadata. 
        if (['int', 'bigint', 'float', 'decimal'].includes(fieldMetadata.type)) {
          // initialFilters[column.attrs.name] = { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
          initialFilters[column.attrs.name] = { value: null, matchMode: FilterMatchMode.EQUALS }
        }
        else if (['date', 'datetime', 'time', 'boolean'].includes(fieldMetadata.type)) {
          // initialFilters[column.attrs.name] = { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.DATE_IS }] }
          initialFilters[column.attrs.name] = { value: null, matchMode: FilterMatchMode.EQUALS }
        }
        else if (['relation', 'selectionStatic', 'selectionDynamic'].includes(fieldMetadata.type)) {
          initialFilters[column.attrs.name] = { value: null, matchMode: FilterMatchMode.IN }
        }
        else {
          // initialFilters[column.attrs.name] = { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] }
          initialFilters[column.attrs.name] = { value: null, matchMode: FilterMatchMode.STARTS_WITH }
        }

        if (column.attrs.name === 'id') {
          initialFilters[column.attrs.name] = { value: null, matchMode: FilterMatchMode.IN }
        }

        // Form the "toPopulate" array. 
        if (fieldMetadata.type === 'relation') {
          toPopulate.push(fieldMetadata.name);
        }
        if (fieldMetadata.type === 'mediaSingle' || fieldMetadata.type === 'mediaMultiple') {
          toPopulateMedia.push(fieldMetadata.name);
        }
      }
    }

    // setFilters(initialFilters);
    const recordsInSwimlane = solidKanbanViewMetaData?.data?.solidView?.layout?.attrs?.recordsInSwimlane ? solidKanbanViewMetaData?.data?.solidView?.layout?.attrs?.recordsInSwimlane : 10;
    // setToPopulate(toPopulate);
    // setToPopulateMedia(toPopulateMedia);
    // setRecordsInSwimlane(recordsInSwimlane);
    // setToPopulate(toPopulate);
    // setToPopulateMedia(toPopulateMedia);
    return { recordsInSwimlane, toPopulate, toPopulateMedia }
  }


  // Initial Filter data 
  useEffect(() => {

    if (solidKanbanViewMetaData) {
      setKanbanViewMetaData(solidKanbanViewMetaData);
      const viewModes = solidKanbanViewMetaData?.data?.solidView?.layout?.attrs?.allowedViews && solidKanbanViewMetaData?.data?.solidView?.layout?.attrs?.allowedViews.length > 0 && solidKanbanViewMetaData?.data?.solidView?.layout?.attrs?.allowedViews.map((view: any) => { return { label: capitalize(view), value: view } });
      setViewModes(viewModes);
      if (solidKanbanViewMetaData?.data?.solidView?.layout?.attrs?.grouped !== false) {
        setGroupByFieldName(solidKanbanViewMetaData?.data?.solidView?.layout?.attrs?.groupBy)
      } else {
        setGroupByFieldName("deletedTracker");
        setGroupedView(false);
      }
    }
  }, [solidKanbanViewMetaData]);

  // All kanban view state.
  const [kanbanViewData, setKanbanViewData] = useState<any>([]);
  const [kanbanLoadMoreData, setKanbanLoadMoreData] = useState<any>({});
  const [recordsInSwimlane, setRecordsInSwimlane] = useState(10);
  const [selectedRecords, setSelectedRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDialogVisible, setDialogVisible] = useState(false);
  const [createButtonUrl, setCreateButtonUrl] = useState<string>();
  const [editButtonUrl, setEditButtonUrl] = useState<string>();
  const [createActionQueryParams, setCreateActionQueryParams] = useState<Record<string, string>>({});
  const [editActionQueryParams, setEditActionQueryParams] = useState<Record<string, string>>({});
  const [columnsCount, setColumnsCount] = useState(5);
  const [swimLaneCurrentPageNumber, setSwimLaneCurrentPageNumber] = useState(1);
  const [queryDataLoaded, setQueryDataLoaded] = useState(false);
  const [showSaveFilterPopup, setShowSaveFilterPopup] = useState<boolean>(false);
  const [maxSwimLanesCount, setMaxSwimLanesCount] = useState<number>(0);
  // @ts-ignore
  const editBaseUrl = normalizeSolidListKanbanActionPath(pathname, editButtonUrl || "form");
  // Get the kanban view data.
  // const [triggerGetSolidEntitiesForKanban, { data: solidEntityKanbanViewData, isLoading, error }] = useLazyGetSolidKanbanEntitiesQuery();
  const [triggerGetSolidEntities, { data: solidEntityKanbanViewData }] = useLazyGetSolidEntitiesQuery();

  // Delete mutation 
  const [
    deleteManySolidEntities,
    {
      isSuccess: isDeleteSolidEntitiesSucess,
    },
  ] = useDeleteMultipleSolidEntitiesMutation();
  const [
    patchKanbanView,
  ] = usePatchUpdateSolidEntityMutation();

  // After data is fetched populate the kanban view state so as to be able to render the data. 
  useEffect(() => {
    if (solidEntityKanbanViewData) {
      // Merge groupRecords by groupName: update existing, add new
      setMaxSwimLanesCount(solidEntityKanbanViewData?.meta?.totalRecords || 0);
      const groupRecords = solidEntityKanbanViewData?.groupRecords || [];
      const groupMap = new Map((kanbanViewData || []).map((g: any) => [g.groupName, g]));
      groupRecords.forEach((newGroup: any) => {
        groupMap.set(newGroup.groupName, newGroup);
      });
      const latestKanbanGroupData = Array.from(groupMap.values());
      setKanbanViewData(latestKanbanGroupData);
      const loadmoredata = Object.entries(latestKanbanGroupData).reduce((acc: any, [, value]: any) => {
        acc[value.groupName] = {
          offset: (value.groupData.meta.currentPage - 1) * value.groupData.meta.perPage,
          limit: value.groupData.meta.perPage,
          count: value.groupData.meta.totalRecords
        };
        return acc;
      }, {});

      setKanbanLoadMoreData(loadmoredata)
      setLoading(false);
    }
  }, [solidEntityKanbanViewData]);

  useEffect(() => {
    if (solidKanbanViewMetaData) {
      const kanbanViewLayoutAttrs = solidKanbanViewMetaData?.data?.solidView?.layout?.attrs;
      const createActionUrl = kanbanViewLayoutAttrs?.createAction && kanbanViewLayoutAttrs?.createAction?.type === "custom" ? kanbanViewLayoutAttrs?.createAction?.customComponent : "form/new";
      const editActionUrl = kanbanViewLayoutAttrs?.editAction && kanbanViewLayoutAttrs?.editAction?.type === "custom" ? kanbanViewLayoutAttrs?.editAction?.customComponent : "form";

      if (kanbanViewLayoutAttrs?.createAction) {
        setCreateActionQueryParams({
          actionName: kanbanViewLayoutAttrs.createAction.name,
          actionType: kanbanViewLayoutAttrs.createAction.type,
          actionContext: kanbanViewLayoutAttrs.createAction.context,
        });
      }
      if (kanbanViewLayoutAttrs?.editAction) {
        setEditActionQueryParams({
          actionName: kanbanViewLayoutAttrs.editAction.name,
          actionType: kanbanViewLayoutAttrs.editAction.type,
          actionContext: kanbanViewLayoutAttrs.editAction.context,
        });
      }

      if (createActionUrl) {
        setCreateButtonUrl(createActionUrl)
      }
      if (editActionUrl) {
        setEditButtonUrl(editActionUrl)
      }
    }
  }, [solidKanbanViewMetaData])

  // Fetch data after toPopulate has been populated...
  useEffect(() => {

    if (solidKanbanViewMetaData) {

      const swimlanesCount = solidKanbanViewMetaData?.data.solidView?.layout?.attrs?.swimlanesCount || 5;
      if (groupByFieldName) {

        const queryObject = queryStringToQueryObject();
        let queryString = "";
        if (queryObject) {
          const filters = {
            $and: []
          }
          if (queryObject.custom_filter_predicate) {
            // @ts-ignore
            filters.$and.push(queryObject.custom_filter_predicate);
          }
          if (queryObject.search_predicate) {
            // @ts-ignore
            filters.$and.push(queryObject.search_predicate);
          }
          // if (queryObject.saved_filter_predicate) {
          //   filters.$and.push(queryObject.saved_filter_predicate);
          // }
          // if (queryObject.predefined_search_predicate) {
          //   filters.$and.push(queryObject.predefined_search_predicate);
          // }

          const queryData = {
            offset: 0,
            limit: Number(queryObject.limit) + Number(queryObject.offset),
            // fields: queryObject.fields || [`${groupByFieldName}`, `count(${groupByFieldName})`],
            groupBy: queryObject.groupBy || groupByFieldName,
            // @ts-ignore
            populateMedia: queryObject.populateMedia || toPopulateMedia,
            populateGroup: queryObject.populateGroup || true,
            groupFilter: {
              limit: Number(queryObject.groupFilter.limit) + Number(queryObject.groupFilter.offset) || kanbanViewMetaData?.data?.solidView?.layout?.attrs?.recordsInSwimlane,
              offset: 0,
              filters: filters,
              // @ts-ignore
              populate: queryObject.groupFilter.populate || toPopulate,
              // @ts-ignore
              populateMedia: queryObject.groupFilter.populateMedia || toPopulateMedia
            }
            // sort: [`id:desc`],
          };


          const { recordsInSwimlane, toPopulate, toPopulateMedia } = initialFilterMethod();
          setToPopulate(toPopulate);
          setToPopulateMedia(toPopulateMedia);
          setRecordsInSwimlane(recordsInSwimlane);
          // setFilters(filters);
          setQueryDataLoaded(true);

          queryString = qs.stringify(queryData, {
            encodeValuesOnly: true
          });

        } else {
          const { recordsInSwimlane, toPopulate, toPopulateMedia } = initialFilterMethod();
          const queryData = {
            offset: 0,
            limit: swimlanesCount,
            // fields: [`${groupByFieldName}`, `count(${groupByFieldName})`],
            groupBy: groupByFieldName,
            populateMedia: toPopulateMedia,
            populateGroup: true,
            groupFilter: {
              limit: kanbanViewMetaData?.data?.solidView?.layout?.attrs?.recordsInSwimlane || 10,
              offset: 0,
              filters: filters,
              populate: toPopulate,
              populateMedia: toPopulateMedia
            }
            // sort: [`id:desc`],
          };
          setRecordsInSwimlane(recordsInSwimlane);
          setToPopulate(toPopulate);
          setToPopulateMedia(toPopulateMedia);

          // fields=status&groupBy=status&fields=count(status)&populateGroup=true
          queryString = qs.stringify(queryData, {
            encodeValuesOnly: true
          });

          setQueryDataLoaded(true)
        }

        // triggerGetSolidEntities(queryString);
        setSelectedRecords([]);
      }
    }
  }, [isDeleteSolidEntitiesSucess, groupByFieldName, solidKanbanViewMetaData]);

  // clickable link allowing one to open the detail / form view.

  // handle bulk deletion
  const deleteBulk = () => {
    let deleteList: any = [];
    selectedRecords.forEach((element: any) => {
      deleteList.push(element.id);
    });
    deleteManySolidEntities(deleteList);
    setDialogVisible(false);
  };

  // handle closing of the delete dialog...
  const onDeleteClose = () => {
    setDialogVisible(false);
    setSelectedRecords([]);
  }


  // Individual Swimlane Load More
  const handleLoadMore = async (groupByField: string) => {
    const { offset, limit } = kanbanLoadMoreData[groupByField];
    kanbanLoadMoreData[groupByField].offset = offset + limit;
    try {
      const queryData = {
        offset: offset + limit,
        limit: limit,
        populate: toPopulate,
        populateMedia: toPopulateMedia,
        populateGroup: true,
        filters: {
          [groupByFieldName]: {
            $in: [groupByField],
          },
          ...filters
        }
      }


      const queryString = qs.stringify(queryData, {
        encodeValuesOnly: true
      });
      // router.push(`?${queryString}`);
      const data: any = await triggerGetSolidEntities(queryString);
      const newRecords = data.data.records;
      const mergeData = (
        kanbanViewData: any[],
        newRecords: any[],
        groupByField: string
      ) => {
        // Find the group matching the specified groupByField
        const originalData = structuredClone(kanbanViewData);
        const targetGroup = originalData.find(
          (group: any) => group.groupName === groupByField
        );
        if (targetGroup) {
          const { groupData } = targetGroup;

          if (targetGroup.groupData) {
            // Extract existing records
            const existingRecords = targetGroup.groupData.records;
            const updatedRecords = [...existingRecords, ...newRecords];
            targetGroup.groupData.records = updatedRecords


            // Update the meta data (you can adjust this logic as needed)
            groupData.meta.prevPage = groupData.meta.currentPage
            groupData.meta.currentPage = groupData.meta.currentPage + 1
            groupData.meta.nextPage = groupData.meta.currentPage + 1
          }
        }
        return originalData;
      };


      const updatedData = mergeData(kanbanViewData, newRecords, groupByField);
      setKanbanViewData(updatedData);
      const loadmoredata = Object.entries(updatedData).reduce((acc: any, [, value]: any) => {
        acc[value.groupName] = {
          offset: (value.groupData.meta.currentPage - 1) * value.groupData.meta.perPage,
          limit: value.groupData.meta.perPage,
          count: value.groupData.meta.totalRecords
        };
        return acc;
      }, {});
      setKanbanLoadMoreData(loadmoredata)

    } catch (error) {
      console.error(ERROR_MESSAGES.LOAD_MORE_DATA, error);
    }
  };


  // Handle drag-and-drop functionality
  // @ts-ignore
  const onDragEnd = async (result: DropResult): void => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceGroupName = source.droppableId;
    const destinationGroupName = destination.droppableId;

    // Find the source and destination groups
    const sourceGroupIndex = kanbanViewData.findIndex((group: any) => group.groupName === sourceGroupName);
    const destinationGroupIndex = kanbanViewData.findIndex((group: any) => group.groupName === destinationGroupName);

    if (sourceGroupIndex === -1 || destinationGroupIndex === -1) return;

    // If dragging within the same group
    if (sourceGroupName === destinationGroupName) {
      setKanbanViewData((prevData: typeof kanbanViewData) =>
        prevData.map((group: any) => {
          if (group.groupName === sourceGroupName) {
            const updatedRecords = [...group.groupData.records];
            const [movedItem] = updatedRecords.splice(source.index, 1); // Remove the item
            updatedRecords.splice(destination.index, 0, movedItem); // Insert at the new position

            return {
              ...group,
              groupData: {
                ...group.groupData,
                records: updatedRecords,
              },
            };
          }
          return group;
        })
      );
      return;
    }

    // Deep clone the source and destination groups
    const sourceGroup = JSON.parse(JSON.stringify(kanbanViewData[sourceGroupIndex]));
    const destinationGroup = JSON.parse(JSON.stringify(kanbanViewData[destinationGroupIndex]));

    // Clone the records for immutability
    const sourceRecords = [...sourceGroup.groupData.records];
    const destinationRecords = [...destinationGroup.groupData.records];

    // Remove the item from the source
    const [movedItem] = sourceRecords.splice(source.index, 1);

    // Create a mutable copy of the moved item
    const updatedItem = { ...movedItem, status: destinationGroupName };

    // Add the updated item to the destination
    destinationRecords.splice(destination.index, 0, updatedItem);

    // Update the group data
    sourceGroup.groupData.records = sourceRecords;
    destinationGroup.groupData.records = destinationRecords;

    // Update the kanbanViewData state
    const oldkanbanViewData = structuredClone(kanbanViewData);
    try {
      const formData = new FormData();
      formData.append(groupByFieldName, destinationGroupName);
      // Update the kanbanViewData state
      setKanbanViewData((prevData: typeof kanbanViewData) =>
        prevData.map((group: any) => {
          if (group.groupName === sourceGroupName) {
            return sourceGroup;
          }
          if (group.groupName === destinationGroupName) {
            return destinationGroup;
          }
          return group;
        })
      );
      const kanbanUpdateResponse = await patchKanbanView({ id: +movedItem.id, data: formData }).unwrap();

      if (kanbanUpdateResponse?.statusCode === 200) {
        showToast(toast, "success", ERROR_MESSAGES.IS_SUCCESS, ERROR_MESSAGES.KANBAN_UPDATED);
      } else {
        showToast(toast, "error", ERROR_MESSAGES.DUPLICATE_KEY, kanbanUpdateResponse?.error);
        // Update the kanbanViewData state
        setKanbanViewData(oldkanbanViewData);
      }
    } catch (error: any) {
      // 6. Handle 500 or network errors
      console.error(ERROR_MESSAGES.API_ERROR, error);
      showToast(toast, "error", ERROR_MESSAGES.SOMETHING_WRONG, error?.data?.message || ERROR_MESSAGES.SOMETHING_WRONG);
      setKanbanViewData(oldkanbanViewData);
    }
  };


  // Handle SwimLane Pagination
  const handleSwimLanePagination = async () => {

    if (solidKanbanViewMetaData) {

      const swimlanesCount = solidKanbanViewMetaData?.data.solidView?.layout?.attrs?.swimlanesCount || 5;
      const queryData = {
        offset: swimLaneCurrentPageNumber * swimlanesCount,
        limit: swimlanesCount,
        // fields: [`${groupByFieldName}`, `count(${groupByFieldName})`],
        groupBy: groupByFieldName,
        populateMedia: toPopulateMedia,
        populate: toPopulate,
        populateGroup: true,
        groupFilter: {
          limit: recordsInSwimlane,
          offset: 0,
          filters: filters,
          populate: toPopulate,
          populateMedia: toPopulateMedia

        }
        // sort: [`id:desc`],
      };
      // fields=status&groupBy=status&fields=count(status)&populateGroup=true
      const queryString = qs.stringify(queryData, {
        encodeValuesOnly: true
      });

      const data: any = await triggerGetSolidEntities(queryString);
      if (data && data?.data?.groupRecords.length > 0) {
        const updatedData = [...kanbanViewData, ...data.data.groupRecords];
        setKanbanViewData(updatedData);
      }
      setSwimLaneCurrentPageNumber(swimLaneCurrentPageNumber + 1)
    }
  }


  // Handle the custom filter and Search Filter
  const handleApplyCustomFilter = async (transformedFilter: any) => {

    if (solidKanbanViewMetaData) {
      const queryfilter = {
        $and: [
        ]
      }
      // if (transformedFilter.s_filter) {
      //   queryfilter.$and.push(transformedFilter.s_filter)
      // }
      // if (transformedFilter.c_filter) {
      //   queryfilter.$and.push(transformedFilter.c_filter)
      // }


      if (transformedFilter.custom_filter_predicate) {
        // @ts-ignore
        queryfilter.$and.push(transformedFilter.custom_filter_predicate);
      }
      if (transformedFilter.search_predicate) {
        // @ts-ignore
        queryfilter.$and.push(transformedFilter.search_predicate);
      }
      if (transformedFilter.saved_filter_predicate) {
        // @ts-ignore
        queryfilter.$and.push(transformedFilter.saved_filter_predicate);
      }
      if (transformedFilter.predefined_search_predicate) {
        // @ts-ignore
        queryfilter.$and.push(transformedFilter.predefined_search_predicate);
      }

      const customFilter = transformedFilter;
      const updatedFilter = { ...(filters || {}), ...(queryfilter || {}) };

      // Then update state
      setFilters(updatedFilter);


      const swimlanesCount = solidKanbanViewMetaData?.data.solidView?.layout?.attrs?.swimlanesCount || 5;
      // const { toPopulate, toPopulateMedia } = initialFilterMethod();

      const queryData = {
        offset: 0,
        limit: swimlanesCount,
        // fields: [`${groupByFieldName}`, `count(${groupByFieldName})`],
        groupBy: groupByFieldName,
        populateMedia: toPopulateMedia,
        populateGroup: true,
        groupFilter: {
          limit: recordsInSwimlane,
          offset: 0,
          filters: updatedFilter,
          populate: toPopulate,
          populateMedia: toPopulateMedia
        }
      }
      const queryString = qs.stringify(queryData, {
        encodeValuesOnly: true
      });

      // s_filter and c_filter format that needs to be passed to the router
      // only present if handleCustomFilter is applied
      if (customFilter) {
        const urlData = structuredClone(queryData);
        // @ts-ignore
        delete urlData.filters;
        // urlData.s_filter = customFilter.s_filter || {};
        // urlData.c_filter = customFilter.c_filter || {};
        // @ts-ignore
        urlData.custom_filter_predicate = customFilter.custom_filter_predicate || {};
        // @ts-ignore
        urlData.search_predicate = customFilter.search_predicate || {};
        // @ts-ignore
        queryObjectToQueryString(urlData);
      }


      const data: any = await triggerGetSolidEntities(queryString);

      // Update the kanban view data with the new data based on filter
      setSwimLaneCurrentPageNumber(1);
      if (data && data?.data?.groupRecords.length > 0) {
        const updatedData = [...data.data.groupRecords];
        setKanbanViewData(updatedData);
      }
      setSelectedRecords([]);


    }

  }

  useEffect(() => {
    if (solidKanbanViewMetaData) {
      const createActionUrl = solidKanbanViewMetaData?.data?.solidView?.layout?.attrs?.createAction && solidKanbanViewMetaData?.data?.solidView?.layout?.attrs?.createAction?.type === "custom" ? solidKanbanViewMetaData?.data?.solidView?.layout?.attrs?.createAction?.customComponent : "form/new";
      const editActionUrl = solidKanbanViewMetaData?.data?.solidView?.layout?.attrs?.editAction && solidKanbanViewMetaData?.data?.solidView?.layout?.attrs?.editAction?.type === "custom" ? solidKanbanViewMetaData?.data?.solidView?.layout?.attrs?.editAction?.customComponent : "form";
      const viewModes = solidKanbanViewMetaData?.data?.solidView?.layout?.attrs?.allowedViews && solidKanbanViewMetaData?.data?.solidView?.layout?.attrs?.allowedViews.length > 0 && solidKanbanViewMetaData?.data?.solidView?.layout?.attrs?.allowedViews.map((view: any) => { return { label: capitalize(view), value: view } });
      setViewModes(viewModes);
      if (createActionUrl) {
        setCreateButtonUrl(createActionUrl)
      }
      if (editActionUrl) {
        setEditButtonUrl(editActionUrl)
      }
    }
  }, [solidKanbanViewMetaData])

  const kanbanViewTitle = solidKanbanViewMetaData?.data?.solidView?.displayName


  const toggleBothSidebars = () => {
    if (visibleNavbar) {
      dispatch(toggleNavbar());   // close both
    } else {
      dispatch(showNavbar());     // open both
    }
  };

  return (
    <div className="page-parent-wrapper">
      <Toast ref={toast} />
      <div className="page-header flex-column lg:flex-row">
        <div className="flex justify-content-between w-full ">

          <div className="flex align-items-center solid-header-buttons-wrapper">
            {params.embeded !== true &&
              <div className="apps-icon block md:hidden cursor-pointer" onClick={toggleBothSidebars}>
                <i className="pi pi-th-large"></i>
              </div>
            }

            <p className="m-0 view-title solid-text-wrapper">{kanbanViewTitle}</p>
            {solidKanbanViewMetaData?.data?.solidView?.layout?.attrs.enableGlobalSearch === true &&
              // <SolidGlobalSearchElement viewData={solidKanbanViewMetaData} handleApplyCustomFilter={handleApplyCustomFilter} ></SolidGlobalSearchElement>
              <div className="hidden lg:flex">
                <SolidGlobalSearchElement showSaveFilterPopup={showSaveFilterPopup} setShowSaveFilterPopup={setShowSaveFilterPopup} ref={solidGlobalSearchElementRef} viewData={solidKanbanViewMetaData} handleApplyCustomFilter={handleApplyCustomFilter}  ></SolidGlobalSearchElement>
              </div>
            }
          </div>

          <div className="flex align-items-center solid-header-buttons-wrapper">
            {solidKanbanViewMetaData?.data?.solidView?.layout?.attrs.enableGlobalSearch === true &&
              <div className="flex lg:hidden">
                <Button
                  type="button"
                  size="small"
                  icon="pi pi-search"
                  severity="secondary"
                  outlined
                  className="solid-icon-button"
                  onClick={() => setShowGlobalSearchElement(!showGlobalSearchElement)}>
                </Button>
              </div>
            }

            {actionsAllowed.includes(`${permissionExpression(params.modelName, 'create')}`) && solidKanbanViewMetaData?.data?.solidView?.layout?.attrs.create !== false &&
              <SolidCreateButton createButtonUrl={createButtonUrl} createActionQueryParams={createActionQueryParams} responsiveIconOnly={true} />
            }

            {actionsAllowed.includes(`${permissionExpression(params.modelName, 'delete')}`) && solidKanbanViewMetaData?.data?.solidView?.layout?.attrs.delete !== false && selectedRecords.length > 0 && <Button
              type="button"
              label="Delete"
              size="small"
              onClick={() => setDialogVisible(true)}
              className="small-button "
              severity="danger"
            />}
            <Button
              type="button"
              size="small"
              icon="pi pi-refresh"
              severity="secondary"
              className="solid-icon-button"
              outlined
              onClick={() => {
                window.location.reload()
              }}
            />
            <SolidKanbanViewConfigure
              solidKanbanViewMetaData={solidKanbanViewMetaData}
              actionsAllowed={actionsAllowed}
              viewModes={viewModes}
              setLayoutDialogVisible={setLayoutDialogVisible}
              setShowSaveFilterPopup={setShowSaveFilterPopup}
            />
            {/* <SolidConfigureLayoutElement></SolidConfigureLayoutElement> */}
          </div>
        </div>
        {/* </div> */}
        {solidKanbanViewMetaData?.data?.solidView?.layout?.attrs.enableGlobalSearch === true && showGlobalSearchElement && (
          <div className="flex lg:hidden">
            <SolidGlobalSearchElement showSaveFilterPopup={showSaveFilterPopup} setShowSaveFilterPopup={setShowSaveFilterPopup} ref={solidGlobalSearchElementRef} viewData={solidKanbanViewMetaData} handleApplyCustomFilter={handleApplyCustomFilter}  ></SolidGlobalSearchElement>
          </div>
        )}
      </div>

      <style>{`.p-datatable .p-datatable-loading-overlay {background-color: rgba(0, 0, 0, 0.0);}`}</style>
      {solidKanbanViewMetaData && kanbanViewData &&
        <KanbanBoard groupByFieldName={groupByFieldName} groupedView={groupedView} kanbanViewData={kanbanViewData} maxSwimLanesCount={maxSwimLanesCount} solidKanbanViewMetaData={solidKanbanViewMetaData?.data} setKanbanViewData={setKanbanViewData} handleLoadMore={handleLoadMore} onDragEnd={onDragEnd} handleSwimLanePagination={handleSwimLanePagination} setLightboxUrls={setLightboxUrls} setOpenLightbox={setOpenLightbox} editButtonUrl={editBaseUrl}></KanbanBoard>
      }

      <Dialog
        visible={isDialogVisible}
        header="Confirm Delete"
        modal
        className="solid-confirm-dialog"
        footer={() => (
          <div className="flex justify-content-center">
            <Button label="Yes" icon="pi pi-check" className='small-button' severity="danger" autoFocus onClick={deleteBulk} />
            <Button label="No" icon="pi pi-times" className='small-button' onClick={onDeleteClose} />
          </div>
        )}
        onHide={() => setDialogVisible(false)}
      >
        <p>Are you sure you want to delete the selected records?</p>
      </Dialog>
      {openLightbox &&
        <Lightbox
          open={openLightbox}
          plugins={[Counter, Download]}
          close={() => setOpenLightbox(false)}
          // @ts-ignore
          slides={lightboxUrls}
        />
      }
      <Dialog
        visible={isLayoutDialogVisible}
        header="Change Kanban Layout"
        modal
        onHide={() => setLayoutDialogVisible(false)}
        // contentStyle={{
        //   width: 800
        // }}
        style={{ width: '800px' }}
        breakpoints={{
          '1024px': '75vw', '991px': '86vw', '767px': '92vw', '250px': '96vw'
        }}

      >
        <KanbanUserViewLayout solidKanbanViewMetaData={solidKanbanViewMetaData} setLayoutDialogVisible={setLayoutDialogVisible} />
      </Dialog>
    </div>
  );
};
