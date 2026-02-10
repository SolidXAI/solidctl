import { Toast } from "primereact/toast";
import { RefObject } from "react";

const showToast = (toast: RefObject<Toast>, severity: "success" | "error" | "info", summary: string, detail: string) => {
    toast.current?.show({
        severity,
        summary,
        detail,
        // stays until user closes
        ...(severity === "error" ? { sticky: true } : { life: 3000 }),
    });
};
export default showToast;