import { useSession } from "../../../hooks/useSession";
import { hasAnyRole } from "../../../helpers/rolesHelper";
import { Button } from "primereact/button";

export const SolidListViewRowButtonContextMenu = ({ button, params, getSelectedSolidViewData, solidListViewMetaData, handleCustomButtonClick }: any) => {
    const selectedSolidViewData = getSelectedSolidViewData?.();

    const { data: session, status } = useSession();
    const user = session?.user;

    const hasRole = !button?.attrs?.roles || button?.attrs?.roles.length === 0 ? true : hasAnyRole(user?.roles, button?.attrs?.roles);

    if (!hasRole) return null;

    return (
        <Button
            type="button"
            icon={button?.attrs?.icon ? button?.attrs?.icon : "pi pi-pencil"}
            className={`w-full text-left gap-2 ${button?.attrs?.className ? button?.attrs?.className : ''}`}
            label={button.attrs.label}
            size="small"
            onClick={() => {
                const event = {
                    params,
                    rowData: selectedSolidViewData,
                    solidListViewMetaData: solidListViewMetaData.data,
                };

                const modifiedButtonAttrs = { ...button.attrs }; // Create a copy

                // Conditionally add popupWidth for specific actions
                if (modifiedButtonAttrs.action === 'GenerateModelCodeRowAction' || modifiedButtonAttrs.action === 'GenerateModuleCodeRowAction') {
                    modifiedButtonAttrs.popupWidth = '30vw';
                }

                handleCustomButtonClick(modifiedButtonAttrs, event);
            }}
        />
    );
};
