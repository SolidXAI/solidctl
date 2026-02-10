import Link from "../../common/Link";
import { usePathname } from "../../../hooks/usePathname";
import { Button } from 'primereact/button';
import { normalizeSolidListKanbanActionPath } from "../../../helpers/routePaths";

export const SolidCreateButton = ({ createButtonUrl, createActionQueryParams, solidListViewLayout, responsiveIconOnly = false }: any) => {
    const pathName = usePathname();

    const resolveCreatePath = () => {
        if (createButtonUrl) {
            const normalizedUrl = normalizeSolidListKanbanActionPath(pathName, createButtonUrl);
            const query = new URLSearchParams(createActionQueryParams).toString();
            return query ? `${normalizedUrl}?${query}` : normalizedUrl;
        }

        return `${normalizeSolidListKanbanActionPath(pathName, "form")}/new?viewMode=edit`;
    };

    const createPath = resolveCreatePath();

    const icon = solidListViewLayout?.attrs?.addButtonIcon || "pi pi-plus";
    const label = solidListViewLayout?.attrs?.addButtonTitle || "Add";
    const className = solidListViewLayout?.attrs?.addButtonClassName || "";

    return (
        <div>
            <Link href={createPath}>
                {responsiveIconOnly ? (
                    <>
                        <Button
                            type="button"
                            icon={icon}
                            className={`${className} p-button-sm lg:hidden solid-icon-button `}
                            size='small'
                        />

                        <Button
                            type="button"
                            icon={icon}
                            label={label}
                            className={`${className} hidden lg:inline-flex`}
                            size='small'

                        />
                    </>
                ) : (
                    <Button
                        type="button"
                        icon={icon}
                        label={label}
                        className={`${className}`}
                        size='small'
                    />
                )}

            </Link>
        </div>
    );
};
