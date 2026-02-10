
import { CreateButton } from "../../../components/common/CreateButton";
import { handleError, handleSuccess } from "../../../helpers/ToastContainer";
import { useDeleteMultiplemodulesMutation, useGenerateCodeFormoduleMutation, useLazyGetmodulesQuery, useRefreshPermissionsMutation } from "../../../redux/api/moduleApi";
import { FetchBaseQueryError } from "@reduxjs/toolkit/dist/query";
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
import { Toast } from "primereact/toast";
import qs from "qs";
import { useEffect, useRef, useState } from "react";

export interface ModelMetaData {
  id: string;
  displayName: string;
  isSystem: boolean;
}

interface ErrorResponseData {
  message: string;
  statusCode: number;
  error: string;
}
export const ModuleListViewData = () => {
  const toast = useRef<Toast>(null);

  const [moduleMetadata, setModuleMetadata] = useState<ModelMetaData[]>([]);

  const [filters, setFilters] = useState<DataTableFilterMeta>({
    displayName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
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
  const [isGenerateCodeVisible, setGenerateCodeVisible] = useState(false);
  const [generateCodeForModule, setGenerateCodeForModule] = useState<any>();


  const [triggerGetModule, { data: module, isLoading, error }] =
    useLazyGetmodulesQuery();

  const [
    generateCode,
    { isLoading: isGenerateCodeUpdating, isSuccess: isGenerateCodeSuceess, isError: isGenerateCodeError, error: generateCodeError, data: generateCodeData },
  ] = useGenerateCodeFormoduleMutation();

  const [
    refreshPermission,
    { isLoading: isRefreshPermissionUpdating, isSuccess: isRefreshPermissionSuceess, isError: isRefreshPermissionError, error: refreshPermissionError, data: refreshPermissionData },
  ] = useRefreshPermissionsMutation()
  const [
    deleteManyModules,
    {
      isLoading: isModuleDeleted,
      isSuccess: isDeleteModuleSuceess,
      isError: isModuleDeleteError,
      error: ModuleDeleteError,
      data: DeletedModule,
    },
  ] = useDeleteMultiplemodulesMutation();

  useEffect(() => {
    if (module) {
      setModuleMetadata(module?.records);
      setTotalRecords(module?.meta.totalRecords);
      setLoading(false);
    }
  }, [module]);


  useEffect(() => {
    const queryData = {
      offset: 0,
      limit: 25,
      sort: [`id:desc`],
    };
    const queryString = qs.stringify(queryData, {
      encodeValuesOnly: true
    });
    triggerGetModule(queryString);
    setSelectedMenus([]);
  }, [isDeleteModuleSuceess]);

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

    triggerGetModule(queryString);
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

  const detailsBodyTemplate = (moduleMetadata: ModelMetaData) => {
    return (
      <Link
        href={`${moduleMetadata.id}`}
        rel="noopener noreferrer"
        className="text-sm font-bold p-0"
        style={{ color: "#12415D" }}
      >
        {moduleMetadata.isSystem === true &&
          < i className="pi pi-eye" style={{ fontSize: "1rem" }}></i>
        }
        {moduleMetadata.isSystem === false &&
          < i className="pi pi-pencil" style={{ fontSize: "1rem" }}></i>
        }
      </Link >
    );
  };

  const generateCodeBodyTemplate = (moduleMetadata: ModelMetaData) => {

    return (
      <a onClick={() => {
        setGenerateCodeForModule(moduleMetadata.id);
        setGenerateCodeVisible(true);
      }}
        rel="noopener noreferrer"
        className="text-sm font-bold p-0"
        style={{ color: "#12415D" }}
      >
        {moduleMetadata.isSystem === false &&
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
    deleteManyModules(deleteList);
    setDialogVisible(false);
  };

  const onDeleteClose = () => {
    setDialogVisible(false);
    setSelectedMenus([]);
  }

  const generateCodeHandler = async () => {
    await generateCode({ id: generateCodeForModule })
    setGenerateCodeVisible(false)
  }

  const onGenerateCodeClose = () => {
    setGenerateCodeVisible(false);
    setSelectedMenus([]);

  }
  const isFetchBaseQueryErrorWithErrorResponse = (error: any): error is FetchBaseQueryError & { data: ErrorResponseData } => {
    return error && typeof error === 'object' && 'data' in error && 'message' in error.data;
  }

  // const handleError = (errorToast: any) => {
  //   let errorMessage: any = ['An error occurred'];

  //   if (isFetchBaseQueryErrorWithErrorResponse(errorToast)) {
  //     errorMessage = errorToast.data.message;
  //   } else {
  //     errorMessage = ['Something went wrong'];
  //   }

  //   toast?.current?.show({
  //     severity: 'error',
  //     summary: 'Error',
  //     detail: errorMessage,
  //     life: 3000,
  //     //@ts-ignore
  //     content: (props) => (
  //       <div className="flex flex-column align-items-left" style={{ flex: "1" }}>
  //         {Array.isArray(errorMessage) ? (
  //           errorMessage.map((message, index) => (
  //             <div className="flex align-items-center gap-2" key={index}>
  //               <span className="font-bold text-900">{message.trim()}</span>
  //             </div>
  //           ))
  //         ) : (
  //           <div className="flex align-items-center gap-2">
  //             <span className="font-bold text-900">{errorMessage?.trim()}</span>
  //           </div>
  //         )}
  //       </div>
  //     ),
  //   });
  // };


  useEffect(() => {
    if (isGenerateCodeError) {
      handleError(generateCodeError)
    }
  }, [isGenerateCodeError])


  useEffect(() => {
    if (isGenerateCodeSuceess) {
      handleSuccess(["Code Generated Successfully"])
    }
  }, [isGenerateCodeSuceess])

  const handleRefreshPermission = () => {
    refreshPermission("")
  }

  return (
    <div className="">
      <Toast ref={toast} />

      <div className="flex gap-3 mb-4">
        <CreateButton />
        <Button className='small-button' onClick={handleRefreshPermission}>Refresh Permissions</Button>
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
        value={moduleMetadata}
        lazy
        size="small"
        paginator
        rows={rows}
        rowsPerPageOptions={[10, 25, 50]}
        dataKey="id"
        filters={filters}
        emptyMessage="No Modules found"
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
          header="Display Name"
          className="text-sm"
          sortable
          filter
          filterPlaceholder="Search model by name"
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
        <p>Are you sure you want to delete the selected Modules?</p>
      </Dialog>
      <Dialog
        visible={isGenerateCodeVisible}
        header="Generate Code"
        headerClassName="text-center"
        modal
        className="solid-confirm-dialog"
        footer={() => (
          <div className="flex justify-content-center">
            <Button label="Yes" icon="pi pi-check" className='small-button' severity="danger" autoFocus onClick={generateCodeHandler} />
            <Button label="No" icon="pi pi-times" className='small-button' onClick={onGenerateCodeClose} />
          </div>
        )}
        onHide={() => setGenerateCodeVisible(false)}
      >
        <p className="text-center">Proceed with module code generation? Existing files will be overwritten.</p>
      </Dialog>
    </div>
  );
};
