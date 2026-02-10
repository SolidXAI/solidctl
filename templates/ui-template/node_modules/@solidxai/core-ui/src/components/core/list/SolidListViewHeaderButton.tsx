import { useSession } from "../../../hooks/useSession";
import { hasAnyRole } from "../../../helpers/rolesHelper";
import { Button } from "primereact/button";

export const SolidListViewHeaderButton = ({ button, params, solidListViewMetaData, handleCustomButtonClick, selectedRecords, filters }: any) => {
    const { data: session, status } = useSession();
    const user = session?.user;

    const hasRole = !button?.attrs?.roles || button?.attrs?.roles.length === 0 ? true : hasAnyRole(user?.roles, button?.attrs?.roles);

    if (!hasRole) return null;

    return (
        <Button
            type="button"
            className={`text-left ${button?.attrs?.className ?? "gap-2"}`}
            label={button.attrs.label}
            size="small"
            iconPos="left"
            icon={button?.attrs?.icon ?? button?.attrs?.icon}
            onClick={() => {
                const event = {
                    params,
                    solidListViewMetaData: solidListViewMetaData.data,
                    selectedRecords: selectedRecords,
                    filters
                };
                handleCustomButtonClick(button.attrs, event);
            }}
        />
    );
};