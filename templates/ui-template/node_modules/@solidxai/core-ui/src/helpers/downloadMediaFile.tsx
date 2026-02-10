import { ERROR_MESSAGES } from "../constants/error-messages";
import { env } from "../adapters/env";

export const downloadMediaFile = async (fileUrl: string, fileName: string) => {
    try {
        const response = await fetch(`${env("NEXT_PUBLIC_BACKEND_API_URL")}/${fileUrl}`);
        const blob = await response.blob();

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", fileName || "download");

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the object URL
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error(ERROR_MESSAGES.DOWNLOAD_FAILED, error);
    }
};
