import { ERROR_MESSAGES } from "../constants/error-messages";
import { getSession } from "../adapters/auth/index";
import { env } from "../adapters/env";

export async function downloadFileWithProgress(
  url: string,
  handlers: {
    onProgress?: (progress: number) => void;
    onStatusChange?: (status: "In Progress" | "success" | "error", message: string, submessage: string) => void;
  },
  filters: any,
  checkApplyFilter: boolean,
  updateDto: any
): Promise<{ fileName: string; blob: Blob }> {
  const baseUrl = `${env("NEXT_PUBLIC_BACKEND_API_URL")}/api`;

  try {
    handlers.onStatusChange?.("In Progress", "Downloading File", "Please wait.");
    const session = await getSession();
    const headers = new Headers();
    if (session?.user?.accessToken) {
      headers.set("Authorization", `Bearer ${session.user.accessToken}`);
    }
    headers.set("Content-Type", "application/json");
    const requestBody = {
      ...updateDto,
      ...(checkApplyFilter ? { filters } : {})
    };

    const response = await fetch(`${baseUrl}${url}`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody)
    });
    if (!response.ok || !response.body) {
      throw new Error(ERROR_MESSAGES.FAILED_TO_FETCH_FILE);
    }
    const contentDisposition = response.headers.get("Content-Disposition");
    const fileNameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
    const fileName = fileNameMatch?.[1] || "exported-file";

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const extension = contentType.includes("excel") ? ".xlsx" : contentType.includes("csv") ? ".csv" : "";

    const contentLength = response.headers.get("content-length");
    const total = contentLength ? parseInt(contentLength) : 2130;
    const reader = response.body.getReader();
    const chunks: BlobPart[] = [];
    let received = 0;
    let progress = 0;
    const totalDuration = 500; // 1 seconds
    const totalSteps = 100; // Progress steps from 0 to 100
    const progressInterval = totalDuration / totalSteps;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        chunks.push(value);
        const interval = setInterval(() => {
          progress += 1;
          handlers.onProgress?.(progress);

          if (progress >= 100) {
            clearInterval(interval);
          }
        }, progressInterval);
      }
    }

    const blob = new Blob(chunks, { type: contentType });
    const downloadUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName.endsWith(".csv") || fileName.endsWith(".xlsx") ? fileName : `${fileName}${extension}`;
    link.click();
    URL.revokeObjectURL(link.href);
    handlers.onStatusChange?.("success", `${fileName}`, ERROR_MESSAGES.EXPORT_SUCCESSFULLY);
    return { fileName, blob };

  } catch (error) {
    handlers.onStatusChange?.("error", ERROR_MESSAGES.DOWNLOAD_FAILED, ERROR_MESSAGES.TRY_AGAIN);
    throw error;
  }
}
