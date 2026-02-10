import { Button } from 'primereact/button';
import { hasAnyRole } from '../../../helpers/rolesHelper';
import { useSession } from "../../../hooks/useSession";

interface SolidFormViewNormalHeaderButtonProps {
    button: any;
    params: any;
    formik: any;
    solidFormViewMetaData: any;
    handleCustomButtonClick: (attrs: any, event: any) => void;
    formData: any
}

export function SolidFormViewNormalHeaderButton({

    button,
    params,
    formik,
    solidFormViewMetaData,
    handleCustomButtonClick,
    formData
}: SolidFormViewNormalHeaderButtonProps) {

    const { data: session, status } = useSession();
    const user = session?.user;

    const hasRole = !button?.attrs?.roles || button?.attrs?.roles.length === 0 ? true : hasAnyRole(user?.roles, button?.attrs?.roles);

    if (!hasRole) return null;
    if (button?.attrs?.visible == false) return null
    return (
        <div>
            <Button
                type="button"
                className={`w-full text-left gap-2 p-button-sm solid-icon-button ${button?.attrs?.className ? button?.attrs?.className : ''}`}
                label={button.attrs.label}
                size="small"
                iconPos="left"
                icon={button?.attrs?.icon ? button?.attrs?.icon : ""}
                onClick={() => {
                    const event = {
                        action: button.attrs.action,
                        params,
                        formik,
                        solidFormViewMetaData: solidFormViewMetaData.data,
                        formData
                    };
                    handleCustomButtonClick(button.attrs, event);
                }}
            />
        </div>
    );
}
