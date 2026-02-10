
import { SolidCircularLoader } from "../../../../../../components/core/common/SolidLoaders/SolidCircularLoader";
import { ERROR_MESSAGES } from "../../../../../../constants/error-messages";
import { useGetModelsQuery, useLazyGetModelsQuery } from "../../../../../../redux/api/modelApi";
import { useGenerateCodeFormoduleMutation } from "../../../../../../redux/api/moduleApi";
import { createSolidEntityApi } from "../../../../../../redux/api/solidEntityApi";
import { useSeederMutation } from "../../../../../../redux/api/solidServiceApi";
import { closePopup } from "../../../../../../redux/features/popupSlice";
import { SolidListRowdataDynamicFunctionProps } from "../../../../../../types/solid-core";
import { kebabCase } from "lodash";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Toast } from "primereact/toast";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import showToast from "../../../../../../helpers/showToast";

const DeleteModuleRowAction = (event: SolidListRowdataDynamicFunctionProps) => {

    const [isConfirmed, setIsConfirmed] = useState(false);
    const [errorState, setErrorState] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const dispatch = useDispatch();
    const entityApi = createSolidEntityApi("moduleMetadata");
    const { useDeleteSolidEntityMutation } = entityApi;

    const [allowDelete, setAllowDelete] = useState(false);

    const [deleteSolidSingleEntiry, {
        isError: isSolidEntitiesDeleteError,
    }] = useDeleteSolidEntityMutation()

    const queryString = `filters[$and][0][$or][0][module][$in][0]=${event?.rowData?.id}`;
    const { data: models, isLoading: getModelsLoading, error } = useGetModelsQuery(queryString);

    useEffect(() => {
        if (models && models.meta.totalRecords == 0) {
            setAllowDelete(true);
        } else {
            setAllowDelete(false);
        }
    }, [models]);

    const toast = useRef<Toast>(null);

    const deleteModuleHandler = async () => {
        setIsDeleting(true);
        setErrorState(null);
        try {
            const res: any = await deleteSolidSingleEntiry(event.rowData.id)
            // console.log('delete model res', res);
            setErrorState(res.error || null);
            if (res.error) {
                // handle backend or RTK error object
                const message =
                    res.error?.data?.message ||
                    res.error?.error ||
                    ERROR_MESSAGES.ERROR_OCCURED;
                setErrorState(message);
                showToast(toast, 'error', ERROR_MESSAGES.DELETE_FAIELD, message);
            } else {
                showToast(toast, 'success', ERROR_MESSAGES.MODEL_DELETE, ERROR_MESSAGES.MODEL_DELETE_SUCCESSFULLY(event.rowData.singularName));
                dispatch(closePopup());
            }
        } catch (err: any) {
            console.error(ERROR_MESSAGES.DELETE_ERROR, err);
            setErrorState(err.message || ERROR_MESSAGES.NETWORK_ERROR);
            showToast(toast, 'error', ERROR_MESSAGES.ERROR, ERROR_MESSAGES.NETWORK_OR_SERVER_ERROR);
        } finally {
            setIsDeleting(false);
        }
    }

    const rows = [
        { file: `${kebabCase(event.rowData.name)}.module.ts`, description: 'Delete the module file', intervention: 'Automatic'},
        { file: `${kebabCase(event.rowData.name)}-metadata.json`, description: 'Remove the module metadata json file', intervention: 'Automatic' },
    ];

    return (
        <div className="">
            <div className="p-dialog-header secondary-border-bottom py-3" style={{ background: 'var(--solid-light-grey)' }}>
                <span className="p-dialog-title">
                    Delete Module
                </span>
            </div>
            <div className="px-4 pb-4 pt-3">
                <div>
                    <p className="form-field-label font-medium">
                        {allowDelete === true ?
                            "Deleting a module should be done carefully. The below files will be impacted as part of deleting a model:"
                            :
                            "This module still has models associated with it. Please delete those models before deleting the module"
                        }
                    </p>
                    {/* {allowDelete === true && */}
                        <DataTable value={rows} size="small">
                            <Column field="file" header="File Name" />
                            <Column field="description" header="Description" />
                            <Column field="intervention" header="Intervention" />
                        </DataTable>
                    {/* } */}
                    {/* {allowDelete === true &&

                        <div className="my-4">
                            <div className="flex align-items-center">
                                <Checkbox
                                    inputId="confirmation"
                                    name="confirm"
                                    checked={isConfirmed}
                                    onChange={() => setIsConfirmed(!isConfirmed)} />
                                <label htmlFor="confirmation" className="ml-2 form-field-label">
                                    I confirm that #7 &amp; #9 will be done by me manually after the automatic steps above are applied.
                                </label>
                            </div>
                        </div>
                    } */}
                </div>
                <div className="flex gap-3 justify-content-start">
                    {allowDelete === true &&
                        <Button size="small" label="Apply" autoFocus onClick={deleteModuleHandler} />
                    }
                    <Button size="small" label="Cancel" outlined onClick={() => dispatch(closePopup())} />
                </div>
            </div>
        </div>
    )
}

export default DeleteModuleRowAction;