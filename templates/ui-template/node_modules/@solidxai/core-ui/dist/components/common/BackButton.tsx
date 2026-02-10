

import { usePathname } from "../../hooks/usePathname";
import { useRouter } from "../../hooks/useRouter";
import { Button } from 'primereact/button';
import { useEffect, useState } from 'react';
export const BackButton = () => {
    const router = useRouter();
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);

    // const handleGoBack = () => {
    //     let fromView: string | null = null;
    //     fromView = sessionStorage.getItem("fromView");
    //     if (fromView) {
    //         router.push(fromView);
    //     } else {
    //         // fallback if path is not matched
    //         router.back();
    //     }
    // };


    // const [fromView, setFromView] = useState<"list" | "kanban" | null>(null);

    // useEffect(() => {
    //     if (typeof window !== "undefined") {
    //         const storedView = sessionStorage.getItem("fromView");
    //         if (storedView === "list" || storedView === "kanban") {
    //             setFromView(storedView);
    //         }
    //     }
    // }, []);

    const handleGoBack = () => {
        if (segments.length >= 4 && segments[0] === "admin" && segments[1] === "core") {
            const moduleName = segments[2];
            const modelName = segments[3];
            // Prefer a fully qualified stored return URL (preserves query params like actionId/actionName)
            if (typeof window !== "undefined") {
                const storedFullUrl = sessionStorage.getItem("fromViewUrl");
                if (storedFullUrl) {
                    router.push(storedFullUrl);
                    return;
                }
            }

            const storedView = sessionStorage.getItem("fromView");
            let fromView = "list"
            if (storedView === "list" || storedView === "kanban") {
                fromView = storedView;
            }
            const targetView = fromView || "list";
            const targetUrl = `/admin/core/${moduleName}/${modelName}/${targetView}`;
            router.push(targetUrl);
        } else {
            // fallback if path is not matched
            router.back();
        }
    };

    return (
        <Button
            text
            icon='pi pi-arrow-left'
            size="small"
            type="button"
            aria-label="Back"
            onClick={handleGoBack}
            className='max-w-2rem bg-primary-reverse text-color solid-icon-button'
        />
    )
}
