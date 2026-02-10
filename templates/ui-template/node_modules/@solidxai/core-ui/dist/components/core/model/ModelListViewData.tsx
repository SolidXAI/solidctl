
import { CreateButton } from "../../../components/common/CreateButton";
import {
  useDeleteMultipleModelsMutation,
  useGenerateCodeForModelMutation,
  useLazyGetModelsQuery,
} from "../../../redux/api/modelApi";
import Link from "../../common/Link";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import {
  DataTable,
  DataTableFilterMeta,
  DataTableStateEvent,
} from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import qs from "qs";
import { useEffect, useState } from "react";

export interface ModelMetaData {
  id: string;
  displayName: string;
  module: string;
  isSystem: boolean;
}

export const ModelListViewData = () => {
  const [modelMetadata, setModelMetadata] = useState<ModelMetaData[]>([]);

  const [filters, setFilters] = useState<DataTableFilterMeta>({
    displayName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    "module.displayName": {
      value: null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
  });
  // Lazy loading datatable
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [selectedMenus, setSelectedMenus] = useState<ModelMetaData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDialogVisible, setDialogVisible] = useState(false);
  const [triggerGetModels, { data: model, isLoading, error }] =
    useLazyGetModelsQuery();

  const [isGenerateCodeVisible, setGenerateCodeVisible] = useState(false);
  const [generateCodeForModel, setGenerateCodeForModel] = useState<any>();


  const [
    generateCode,
    { isLoading: isGenerateCodeUpdating, isSuccess: isGenerateCodeSuceess, isError: isGenerateCodeError, error: generateCodeError, data: generateCodeData },
  ] = useGenerateCodeForModelMutation();



  const [
    deleteManyModel,
    {
      isLoading: isModelDeleted,
      isSuccess: isDeleteModelSuceess,
      isError: isModelDeleteError,
      error: ModelDeleteError,
      data: DeletedModel,
    },
  ] = useDeleteMultipleModelsMutation();

  useEffect(() => {
    if (model) {
      setModelMetadata(model?.records);
      setTotalRecords(model?.meta.totalRecords);
      setLoading(false);
    }
  }, [model]);

  useEffect(() => {
    const queryData = {
      offset: 0,
      limit: 25,
      sort: [`id:desc`],
    };
    const queryString = qs.stringify(queryData, {
      encodeValuesOnly: true
    });
    triggerGetModels(queryString);
    setSelectedMenus([]);
  }, [isDeleteModelSuceess]);

  const onPageChange = (event: any) => {
    setFirst(event.first);
    setRows(event.rows);
    setQueryString(event.first, event.rows, sortField, sortOrder, filters);
  };

  const onSort = (event: DataTableStateEvent) => {
    const { sortField, sortOrder } = event;
    const validSortOrder = sortOrder === 1 || sortOrder === -1 ? sortOrder : 0;
    setSortField(sortField);
    setSortOrder(validSortOrder);
    setFirst(0);
    setQueryString(
      0,
      rows,
      sortField,
      sortOrder === 1 || sortOrder === -1 ? sortOrder : 0,
      filters
    );
  };

  const onSelectionChange = (event: any) => {
    const value = event.value;
    setSelectedMenus(value);
  };



  // Filter fuctions
  const setQueryString = async (
    offset?: number,
    row?: number,
    field?: string,
    order?: number,
    filterQuery?: any
  ) => {
    const formattedFilters: any = {};

    Object.keys(filterQuery).forEach((field) => {
      const filterValue = filterQuery[field].value;
      const matchMode = filterQuery[field].matchMode;

      if (filterValue !== null && filterValue !== undefined) {
        let operator = matchMode;
        switch (matchMode) {
          case FilterMatchMode.CONTAINS:
            operator = "$containsi";
            break;
          case FilterMatchMode.STARTS_WITH:
            operator = "$startsWithi";
            break;
          case FilterMatchMode.EQUALS:
            operator = "$eqi";
            break;
          case FilterMatchMode.NOT_CONTAINS:
            operator = "$notContainsi";
            break;
          case FilterMatchMode.NOT_EQUALS:
            operator = "$nei";
            break;
          case FilterMatchMode.ENDS_WITH:
            operator = "$endsWithi";
            break;
          default:
            operator = matchMode;
        }

        if (field.includes(".")) {
          const fieldParts = field.split(".");
          if (!formattedFilters[fieldParts[0]]) {
            formattedFilters[fieldParts[0]] = {};
          }
          formattedFilters[fieldParts[0]][fieldParts[1]] = {
            [operator]: filterValue,
          };
        } else {
          formattedFilters[field] = { [operator]: filterValue };
        }
      }
    });

    const queryData: any = {
      offset: offset ?? first,
      limit: row ?? rows,
      filters: formattedFilters,
    };

    if (field) {
      queryData.sort = [
        `${field}:${order == 0 ? null : order == 1 ? "asc" : "desc"}`,
      ];
    }

    const queryString = qs.stringify(queryData, {
      encodeValuesOnly: true,
    });

    triggerGetModels(queryString);
  };

  const onFilter = (e: any) => {
    setFilters(e.filters);
    setQueryString(
      0,
      rows,
      sortField,
      sortOrder === 1 || sortOrder === -1 ? sortOrder : 0,
      e.filters
    );
  };

  const detailsBodyTemplate = (modelMetadata: ModelMetaData) => {
    return (
      <Link
        href={`${modelMetadata.id}`}
        rel="noopener noreferrer"
        className="text-sm font-bold p-0"
        style={{ color: "#12415D" }}
      >
        {modelMetadata.isSystem === true &&
          < i className="pi pi-eye" style={{ fontSize: "1rem" }}></i>
        }
        {modelMetadata.isSystem === false &&
          < i className="pi pi-pencil" style={{ fontSize: "1rem" }}></i>
        }
      </Link>
    );
  };

  const generateCodeBodyTemplate = (modelMetadata: ModelMetaData) => {

    return (
      <a onClick={() => {
        setGenerateCodeForModel(modelMetadata.id);
        setGenerateCodeVisible(true);
      }}
        rel="noopener noreferrer"
        className="text-sm font-bold p-0"
        style={{ color: "#12415D" }}
      >
        {modelMetadata.isSystem === false &&
          < i className="pi pi-cog" style={{ fontSize: "1rem" }}></i>
        }
      </a >
    );
  };

  const deleteBulk = () => {
    let deleteList: any = [];
    selectedMenus.forEach((element: ModelMetaData) => {
      deleteList.push(element.id);
    });
    deleteManyModel(deleteList);
    setDialogVisible(false);
  };

  const onDeleteClose = () => {
    setDialogVisible(false);
    setSelectedMenus([]);
  }

  const onGenerateCodeClose = () => {
    setGenerateCodeVisible(false);
    setSelectedMenus([]);

  }
  return (
    <div className="">
      <div className="flex gap-3 mb-4">
        <CreateButton />
        {selectedMenus.length > 0 && <Button
          type="button"
          label="Delete"
          size="small"
          onClick={() => setDialogVisible(true)}
          className="small-button"
          severity="danger"
        />}
        {/* <Button
        type="button"
        icon="pi pi-filter-slash"
        label="Clear"
        size="small"
        outlined
      //   onClick={clearFilter}
        className="small-button"
      /> */}
      </div>
      <style>{`
      .p-datatable .p-datatable-loading-overlay {
      background-color: rgba(0, 0, 0, 0.0);
      }
      `}</style>
      <DataTable
        value={modelMetadata}
        lazy
        size="small"
        paginator
        rows={rows}
        rowsPerPageOptions={[10, 25, 50]}
        dataKey="id"
        filters={filters}
        emptyMessage="No Models found"
        onFilter={onFilter}
        filterDisplay="row"
        totalRecords={totalRecords}
        first={first}
        onPage={onPageChange}
        onSort={(e: DataTableStateEvent) => onSort(e)}
        sortField={sortField}
        sortOrder={sortOrder === 1 || sortOrder === -1 ? sortOrder : 0}
        loading={loading || isLoading}
        loadingIcon="pi pi-spinner"
        selection={selectedMenus}
        onSelectionChange={onSelectionChange}
        selectionMode="multiple"
        removableSort
      >
        <Column selectionMode="multiple" headerStyle={{ width: "3em" }} />
        <Column field="id" header="Id" className="text-sm" sortable headerClassName="table-header-fs"></Column>
        <Column
          field="displayName"
          header="displayName"
          className="text-sm"
          sortable
          filter
          filterPlaceholder="Search model by name"
          style={{ minWidth: "12rem" }}
          headerClassName="table-header-fs"
        ></Column>
        <Column
          field="module.displayName"
          header="Module Name"
          className="text-sm"
          // sortable
          filter
          filterPlaceholder="Search model by module name"
          style={{ minWidth: "12rem" }}
          headerClassName="table-header-fs"
        ></Column>
        <Column
          header="Edit"
          body={detailsBodyTemplate}></Column>
        <Column
          header="Code"
          body={generateCodeBodyTemplate}></Column>

      </DataTable>
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
        <p>Are you sure you want to delete the selected Models?</p>
      </Dialog>
      <Dialog
        visible={isGenerateCodeVisible}
        header="Generate Code"
        headerClassName="text-center"
        modal
        footer={() => (
          <div className="flex justify-content-center">
            <Button label="Yes" icon="pi pi-check" className='small-button' severity="danger" autoFocus onClick={() => {
              generateCode({ id: generateCodeForModel })
              setGenerateCodeVisible(false)
            }} />
            <Button label="No" icon="pi pi-times" className='small-button' onClick={onGenerateCodeClose} />
          </div>
        )}
        onHide={() => setGenerateCodeVisible(false)}
      >
        <p className="">Proceed with model code generation? Existing files will be overwritten.</p>
        <p>Below is the list of files that will be created </p>
        <ul>
          <li>Model Entity File</li>
          <li>Model Controller File</li>
          <li>Model Service File</li>
          <li>Model Create and Update Dto files</li>
        </ul>
        <ul></ul>
      </Dialog>
    </div>
  );
};
