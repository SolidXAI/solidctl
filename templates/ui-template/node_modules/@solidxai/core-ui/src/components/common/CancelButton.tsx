

import { usePathname } from "../../hooks/usePathname";
import { useRouter } from "../../hooks/useRouter";
import { Button } from 'primereact/button';


export const CancelButton = () => {
    const router = useRouter();
    const pathname = usePathname(); // Get the current path

    const handleGoBack = () => {
        const segments = pathname.split('/').filter(Boolean); // Split and filter empty segments
        if (segments.length > 1) {
            // const newPath = '/' + segments.slice(0, -1).join('/') + '/all'; // Remove last segment and add "/all"
            // router.push(newPath); // Navigate to the parent route with "/all"            
            router.back()
        }
    };
    return (
        <div>
            <Button outlined size="small" type="button" label="Close" onClick={handleGoBack} className='bg-primary-reverse' style={{ minWidth: 66 }} />
        </div>
    )
}

export const SolidCancelButton = () => {
    const router = useRouter();
    const pathname = usePathname(); // Get the current path

    const handleGoBack = () => {
        let fromView: string | null = null;
        if (typeof window !== "undefined") {
            fromView = sessionStorage.getItem("fromView");
        }

        // Default to 'list' if not available
        const view = fromView === "kanban" ? "kanban" : "list";

        // Navigate back to the previous path with the appropriate view type
        const newPath = pathname.replace(/\/form\/[^/]+$/, `/${view}`);
        router.push(newPath);
        // fromView = sessionStorage.getItem("fromView");
        // if (fromView) {
        //     router.push(fromView);
        // } else {
        //     // fallback if path is not matched
        //     router.back();
        // }
    };
    return (
        <>
            {/* <div className="hidden lg:flex"> */}
            {/* <div> */}
            <Button outlined size="small" type="button" label="Close" onClick={handleGoBack} className='bg-primary-reverse hidden lg:flex' style={{ minWidth: 66 }} />
            {/* </div> */}
            {/* </div> */}
            <Button size="small" type="button" icon="pi pi-times" onClick={handleGoBack} className='bg-primary-reverse solid-icon-button flex lg:hidden' />
        </>
    )
}

