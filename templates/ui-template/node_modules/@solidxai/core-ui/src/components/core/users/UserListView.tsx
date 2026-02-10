
import { useDeleteMultipleUsersMutation, useLazyGetusersQuery } from '../../../redux/api/userApi';
import Link from "../../common/Link";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import {
    DataTable,
    DataTableFilterMeta,
    DataTableStateEvent,
} from "primereact/datatable";
import { useEffect, useRef, useState } from "react";

import { CreateButton } from "../../../components/common/CreateButton";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";
import qs from "qs";
import { ERROR_MESSAGES } from '../../../constants/error-messages';

interface Users {
    id: string;
    fullName: string;
    username: string;
    email: string;
    mobile: string;
    // roles: string[];
}

interface ErrorResponseData {
    message: string;
    statusCode: number;
    error: string;
}

export const UserListView = () => {
    const toast = useRef<Toast>(null);
    const [users, setUsers] = useState<Users[]>([]);
    const [filters, setFilters] = useState<DataTableFilterMeta>({
        fullName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        username: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        email: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        mobile: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        // "roles.name": { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    });
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(25);
    const [totalRecords, setTotalRecords] = useState(0);
    const [sortField, setSortField] = useState("");
    const [sortOrder, setSortOrder] = useState(0);
    const [selectedUsers, setSelectedUsers] = useState<Users[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isDialogVisible, setDialogVisible] = useState(false);
    const [triggerGetUser, { data: user, isLoading, error, isError }] = useLazyGetusersQuery();

    const [
        deleteManyUser,
        {
            isLoading: isUserDeleted,
            isSuccess: isDeleteUserSuceess,
            isError: isUserDeleteError,
            error: UserDeleteError,
            data: DeletedUser,
        },
    ] = useDeleteMultipleUsersMutation();


    useEffect(() => {
        if (user) {
            setUsers(user?.data.records);
            setTotalRecords(user?.data.meta?.totalRecords);
            setLoading(false);
        }
    }, [user]);

    // const initFilters = () => {
    //     setFilters(defaultFilters);
    //     setGlobalFilterValue('');
    // };

    // const clearFilter = () => {
    //     initFilters();
    // };

    useEffect(() => {
        const queryData = {
            offset: 0,
            limit: 25,
            populate: ['roles']
        };
        const queryString = qs.stringify(queryData, {
            encodeValuesOnly: true
        });
        triggerGetUser(queryString);
        setSelectedUsers([]);
    }, [isDeleteUserSuceess]);

    useEffect(() => {
        if (isError || isUserDeleteError) {
            setLoading(false);
            let errorMessage = ERROR_MESSAGES.ERROR_OCCURED;

            const errorToast = isError ? error : UserDeleteError;

            if (isFetchBaseQueryErrorWithErrorResponse(errorToast)) {
                errorMessage = `${errorToast.data.message}`;
            } else {
                errorMessage = ERROR_MESSAGES.SOMETHING_WRONG;
            }

            toast.current?.show({
                severity: 'error',
                summary: ERROR_MESSAGES.ERROR,
                detail: errorMessage,
                life: 3000,
                //@ts-ignore
                content: (props) => (
                    <div
                        className="flex flex-column align-items-left"
                        style={{ flex: "1" }}
                    >
                        <div className="flex align-items-center gap-2" >
                            <span className="font-bold text-900">{errorMessage}</span>
                        </div>
                    </div>
                ),
            });
        }
    }, [isError, isUserDeleteError]);

    function isFetchBaseQueryErrorWithErrorResponse(error: any): error is FetchBaseQueryError & { data: ErrorResponseData } {
        return error && typeof error === 'object' && 'data' in error && 'message' in error.data;
    }

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
        setSelectedUsers(value);
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
                    formattedFilters[fieldParts[0]][fieldParts[1]] = { [operator]: filterValue };
                } else {
                    formattedFilters[field] = { [operator]: filterValue };
                }
            }
        });

        const queryData: any = {
            offset: offset ?? first,
            limit: row ?? rows,
            populate: ['roles'],
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

        triggerGetUser(queryString);
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

    const detailsBodyTemplate = (product: Users) => {
        return (
            <Link
                href={`${product.id}`}
                rel="noopener noreferrer"
                className="text-sm font-bold p-0"
                style={{ color: "#12415D" }}
            >
                <i className="pi pi-pencil" style={{ fontSize: "1rem" }}></i>
            </Link>
        );
    };

    const deleteBulk = () => {
        let deleteList: any = [];
        selectedUsers.forEach((element: Users) => {
            deleteList.push(element.id);
        });
        deleteManyUser(deleteList);
        setDialogVisible(false);
    };

    const onDeleteClose = () => {
        setDialogVisible(false);
        setSelectedUsers([]);
    }

    return (
        <div className="">
            <Toast ref={toast} />
            <div className="flex gap-3 mb-4">
                <CreateButton />
                {selectedUsers.length > 0 && <Button
                    type="button"
                    label="Delete"
                    size="small"
                    onClick={() => setDialogVisible(true)}
                    className="small-button"
                    severity="danger"
                />}
            </div>
            <style>{`
        .p-datatable .p-datatable-loading-overlay {
        background-color: rgba(0, 0, 0, 0.0);
        }
        `}</style>
            <DataTable
                value={users}
                lazy
                tableStyle={{ minWidth: "60rem", margin: "auto" }}
                size="small"
                paginator
                rows={rows}
                rowsPerPageOptions={[10, 25, 50]}
                dataKey="id"
                filters={filters}
                emptyMessage="No users found"
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
                selection={selectedUsers}
                onSelectionChange={onSelectionChange}
                selectionMode="multiple"
                removableSort
            >
                <Column selectionMode="multiple" headerStyle={{ width: "3em" }} />
                <Column field="id" header="ID" className="text-sm" sortable headerClassName="table-header-fs"></Column>
                <Column
                    field="fullName"
                    header="Full Name"
                    className="text-sm"
                    sortable
                    filter
                    filterPlaceholder="Search user by full name"
                    style={{ minWidth: "12rem" }}
                    headerClassName="table-header-fs"
                ></Column>
                <Column
                    field="username"
                    header="Username"
                    className="text-sm"
                    sortable
                    filter
                    filterPlaceholder="Search user by username"
                    style={{ minWidth: "12rem" }}
                    headerClassName="table-header-fs"
                ></Column>
                <Column
                    field="email"
                    header="Email"
                    className="text-sm"
                    sortable
                    filter
                    filterPlaceholder="Search user by email"
                    style={{ minWidth: "12rem" }}
                    headerClassName="table-header-fs"
                ></Column>
                {/* <Column
                    field="roles.name"
                    header="Roles"
                    className="text-sm"
                    filter
                    filterPlaceholder="Search category by parent category"
                    style={{ minWidth: "12rem" }}
                    headerClassName="table-header-fs"
                ></Column> */}
                <Column body={detailsBodyTemplate}></Column>
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
                <p>Are you sure you want to delete the selected Users?</p>
            </Dialog>
        </div>
    );
};
