import { Button } from 'primereact/button';
import { hasAnyRole } from '../../../helpers/rolesHelper';
import { useSession } from "../../../hooks/useSession";

interface SolidFormViewContextMenuHeaderButtonProps {
    button: any;
    params: any;
    formik: any;
    solidFormViewMetaData: any;
    handleCustomButtonClick: (attrs: any, event: any) => void;
    formData: any;
}

export function SolidFormViewContextMenuHeaderButton({
    button,
    params,
    formik,
    solidFormViewMetaData,
    handleCustomButtonClick,
    formData
}: SolidFormViewContextMenuHeaderButtonProps) {

    const { data: session, status } = useSession();
    const user = session?.user;

    const hasRole = !button.attrs?.roles || button?.attrs?.roles.length === 0 ? true : hasAnyRole(user?.roles, button?.attrs?.roles);

    if (!hasRole) return null;
    if (button.attrs?.visible == false) return null
    return (
        <div>
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
                        action: button.attrs.action,
                        params,
                        formik,
                        solidFormViewMetaData: solidFormViewMetaData.data,
                        formData
                    }
                    handleCustomButtonClick(button.attrs, event)
                }}
            />
        </div>
    );
}
