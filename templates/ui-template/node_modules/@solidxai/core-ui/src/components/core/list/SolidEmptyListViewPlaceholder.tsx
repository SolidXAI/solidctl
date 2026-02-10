import { permissionExpression } from '../../../helpers/permissions'
import { SolidCreateButton } from '../common/SolidCreateButton'
import Image from "../../common/Image"
import { Button } from 'primereact/button'
import { useHandleListCustomButtonClick } from '../../../components/common/useHandleListCustomButtonClick'
import { hasAnyRole } from '../../../helpers/rolesHelper'
import { env } from "../../../adapters/env";
import { useSession } from "../../../hooks/useSession";

export const SolidEmptyListViewPlaceholder = ({ createButtonUrl, createActionQueryParams, actionsAllowed, params, solidListViewMetaData }: any) => {
    const noDataText = solidListViewMetaData?.data?.solidView?.layout?.attrs?.listViewNoDataHelperText
        ?? (env("NEXT_PUBLIC_DEFAULT_LIST_VIEW_NODATA_HELPER_TEXT") && solidListViewMetaData?.data?.solidView?.displayName
            ? `${env("NEXT_PUBLIC_DEFAULT_LIST_VIEW_NODATA_HELPER_TEXT")} ${solidListViewMetaData.data.solidView.displayName}`
            : null)

    const handleCustomButtonClick = useHandleListCustomButtonClick()

    const CustomActionButtons = () => {
        return (
            <div>
                {solidListViewMetaData?.data?.solidView?.layout?.attrs.showDefaultAddButton === false && solidListViewMetaData?.data?.solidView?.layout?.attrs?.headerButtons &&
                    solidListViewMetaData?.data?.solidView?.layout?.attrs?.headerButtons.map((button: any) => {

                        const { data: session, status } = useSession();
                        const user = session?.user;

                        const hasRole = !button?.attrs?.roles || button?.attrs?.roles.length === 0 ? true : hasAnyRole(user?.roles, button?.attrs?.roles);

                        if (!hasRole) return null;
                        return (
                            <Button
                                text={button?.attrs?.showText ?? true}
                                type="button"
                                className={`w-full text-left ${button?.attrs?.className ?? 'gap-2'} `}
                                label={button.attrs.label}
                                size="small"
                                iconPos="left"
                                icon={button?.attrs?.icon ? button?.attrs?.icon : "pi pi-pencil"}
                                onClick={() => {
                                    const event = {
                                        params,
                                        solidListViewMetaData: solidListViewMetaData.data
                                    }
                                    handleCustomButtonClick(button.attrs, event)
                                }}
                            />
                        );
                    })
                }
            </div>
        )
    }

    return (
        <>
            {/* <div className="page-header">
                <p className="m-0 view-title">{solidListViewMetaData?.data?.solidView?.layout?.displayName}</p>
            </div> */}
            <div className='solid-empty-listview-placeholder-container'>
                {env("NEXT_PUBLIC_DEFAULT_LIST_VIEW_NODATA_IMAGE") &&
                    <Image
                        alt={solidListViewMetaData?.data?.solidView?.displayName}
                        src={env("NEXT_PUBLIC_DEFAULT_LIST_VIEW_NODATA_IMAGE")}
                        className='relative'
                        height={385}
                        width={617}
                    />
                }
                <div className='text-base font-bold'>
                    No Data Available.
                </div>
                {noDataText &&
                    <div className='text-sm mt-1'>
                        {noDataText}
                    </div>
                }
                {
                    actionsAllowed.includes(`${permissionExpression(params.modelName, 'create')}`) &&
                    solidListViewMetaData?.data?.solidView?.layout?.attrs?.create !== false &&
                    params.embeded !== true &&
                    solidListViewMetaData?.data?.solidView?.layout?.attrs.showDefaultAddButton !== false &&

                    <div className='mt-2'>
                        <SolidCreateButton createButtonUrl={createButtonUrl} createActionQueryParams={createActionQueryParams} title={solidListViewMetaData?.data?.solidView?.displayName} />
                    </div>
                }
                <CustomActionButtons />
                {/* <div>
                    {solidListViewMetaData?.data?.solidView?.layout?.attrs.showDefaultAddButton === false && solidListViewMetaData?.data?.solidView?.layout?.attrs?.headerButtons &&
                        solidListViewMetaData?.data?.solidView?.layout?.attrs?.headerButtons.map((button: any) => {
                            return (
                                <Button
                                    text
                                    type="button"
                                    className={`w-full text-left gap-2 ${button?.attrs?.className ? button?.attrs?.className : ''}`}
                                    label={button.attrs.label}
                                    size="small"
                                    iconPos="left"
                                    icon={button?.attrs?.icon ? button?.attrs?.icon : "pi pi-pencil"}
                                    onClick={() => {
                                        const event = {
                                            params,
                                            solidListViewMetaData: solidListViewMetaData.data
                                        }
                                        handleCustomButtonClick(button.attrs, event)
                                    }}
                                />
                            );
                        })
                    }
                </div> */}
            </div>
        </>
    )
}
