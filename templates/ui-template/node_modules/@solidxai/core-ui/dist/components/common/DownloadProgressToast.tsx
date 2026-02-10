import { Button } from "primereact/button";
import { ProgressBar } from "primereact/progressbar";
import { useEffect, useState } from "react";
import "./solid-export.css";
export const DownloadProgressToast = ({
  progress,
  visible,
  onClose,
  message,
  submessage,
  status
}: {
  progress: number;
  visible: boolean;
  onClose: () => void;
  message?: string;
  submessage?: string;
  status?: string;
}) => {
  useEffect(() => {
    if (progress >= 100) {
      setTimeout(onClose, 2000);
    }
  }, [progress]);

  if (!visible) return null;

  return (
    <div className="SolidExportProgressToaster">
     <div className="flex align-items-center justify-content-between gap-3">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 12.5H10V10.5H11C11.2833 10.5 11.5208 10.4042 11.7125 10.2125C11.9042 10.0208 12 9.78333 12 9.5V8.5C12 8.21667 11.9042 7.97917 11.7125 7.7875C11.5208 7.59583 11.2833 7.5 11 7.5H9V12.5ZM10 9.5V8.5H11V9.5H10ZM13 12.5H15C15.2833 12.5 15.5208 12.4042 15.7125 12.2125C15.9042 12.0208 16 11.7833 16 11.5V8.5C16 8.21667 15.9042 7.97917 15.7125 7.7875C15.5208 7.59583 15.2833 7.5 15 7.5H13V12.5ZM14 11.5V8.5H15V11.5H14ZM17 12.5H18V10.5H19V9.5H18V8.5H19V7.5H17V12.5ZM8 18C7.45 18 6.97917 17.8042 6.5875 17.4125C6.19583 17.0208 6 16.55 6 16V4C6 3.45 6.19583 2.97917 6.5875 2.5875C6.97917 2.19583 7.45 2 8 2H20C20.55 2 21.0208 2.19583 21.4125 2.5875C21.8042 2.97917 22 3.45 22 4V16C22 16.55 21.8042 17.0208 21.4125 17.4125C21.0208 17.8042 20.55 18 20 18H8ZM8 16H20V4H8V16ZM4 22C3.45 22 2.97917 21.8042 2.5875 21.4125C2.19583 21.0208 2 20.55 2 20V6H4V20H18V22H4Z" fill={ status === "error" ? "red" :"#722ED1"}/>
        </svg>
        <div className="flex-1">
          <h2 className={`text-lg font-semibold m-0 ${status === "error" ? "text-red-500" : "ExportText"}`}>
            {message}
          </h2>
          <p className={`text-sm ${status === "error" ? "text-red-400" : "ExportText"}`}>
            {submessage}
          </p>
        </div>
        {status === "success" && (  
        <Button label="View Status" size="small" className="p-button-sm white-space-nowrap p-button-primary" />
        )}
        <svg onClick={onClose} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="20" height="20" rx="10" fill="#F0F0F0"/>
        <path d="M6.8 14L6 13.2L9.2 10L6 6.8L6.8 6L10 9.2L13.2 6L14 6.8L10.8 10L14 13.2L13.2 14L10 10.8L6.8 14Z" fill="#4B4D52"/>
        </svg>
      </div>
      {status !== "error" && (
        <ProgressBar value={progress} showValue={false} className="ExportCustomProgressbar mt-2" />
      )}
    </div>
  );
};
