
import { useEffect, useRef, useState } from "react";
import { SolidFormFieldWidgetProps } from "../../../../../types/solid-core";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { useResolveS3UrlMutation } from "../../../../../redux/api/fieldApi";
import Viewer from "viewerjs";
import "viewerjs/dist/viewer.css";

/**
 * SolidS3FileViewerWidget (PrimeReact version)
 */
export const SolidS3FileViewerWidget = ({ formik, fieldContext }: SolidFormFieldWidgetProps) => {
    const fieldMetadata = fieldContext.fieldMetadata;
    const fieldLayoutInfo = fieldContext.field;
    const fieldLabel = fieldLayoutInfo.attrs.label ?? fieldMetadata.displayName;
    const value = formik.values[fieldLayoutInfo.attrs.name];
    const fileType = fieldLayoutInfo.attrs.fileType?.toLowerCase();
    const downloadAllowed = fieldLayoutInfo.attrs.downloadAllowed !== false;
    const bucketName = fieldLayoutInfo.attrs.bucketName;
    const mediaStorageProviderUserKey = fieldLayoutInfo.attrs.mediaStorageProviderUserKey;
    const isPrivate = fieldLayoutInfo.attrs.isPrivate ? fieldLayoutInfo.attrs.isPrivate : "false";

    const imageRef = useRef<HTMLImageElement | null>(null);
    const viewerRef = useRef<Viewer | null>(null);

    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [shouldShowViewer, setShouldShowViewer] = useState(false);

    const [resolveS3Url] = useResolveS3UrlMutation();

    const fetchS3Url = async () => {
        console.log("fetch url called");
        setIsLoading(true);
        try {
            const result = await resolveS3Url({
                modelName: fieldContext.modelName,
                fieldName: fieldContext.fieldMetadata.name,
                s3Key: value,
                fileType: fileType,
                bucketName: bucketName,
                mediaStorageProviderUserKey: mediaStorageProviderUserKey,
                isPrivate: isPrivate
            }).unwrap();

            setIsLoading(false);
            if (result.statusCode == "200") {
                console.log("fetch url success", result.data.url);
                return result.data.url;
            }
        } catch (e) {
            console.error("Failed to resolve S3 URL:", e);
            setIsLoading(false);
            return null;
        }
    };

    const handleDownload = async () => {
        if (isLoading) return;
        const url = await fetchS3Url();
        if (!url) return;
        const a = document.createElement("a");
        a.href = url;
        a.download = value?.split("/").pop() || "file";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
    };

    const handleView = async () => {
        console.log("isLoading in view", isLoading);
        if (isLoading) return;
        
        const url = await fetchS3Url();
        console.log("url after fetch success", url);
        if (!url) return;
        
        setPreviewUrl(url);
        
        if (isImage) {
            // Trigger viewer to show after state update
            setShouldShowViewer(true);
        } else {
            setOpen(true);
        }
    };

    const isImage = ["jpeg", "jpg", "png", "gif", "webp"].includes(fileType);
    const isPDF = fileType === "pdf";
    const isDownloadOnly = ["xlsx", "xls", "csv", "doc", "docx"].includes(fileType);

    // 🔹 Initialize Viewer.js once image exists
    useEffect(() => {
        if (imageRef.current && previewUrl && isImage) {
            // Destroy existing viewer if any
            if (viewerRef.current) {
                viewerRef.current.destroy();
            }

            // Create new viewer instance
            viewerRef.current = new Viewer(imageRef.current, {
                toolbar: {
                    zoomIn: 1,
                    zoomOut: 1,
                    rotateLeft: 1,
                    rotateRight: 1,
                    reset: 1,
                },
                navbar: false,
                title: false,
                transition: true,
                movable: true,
                scalable: true,
                rotatable: true,
                zoomable: true,
                zIndex:9999,
                // Add hidden event to reset state
                hidden: () => {
                    setShouldShowViewer(false);
                }
            });

            console.log("Viewer initialized");
        }

        return () => {
            if (viewerRef.current) {
                viewerRef.current.destroy();
                viewerRef.current = null;
            }
        };
    }, [previewUrl, isImage]);

    // 🔹 Show viewer when shouldShowViewer becomes true
    useEffect(() => {
        if (shouldShowViewer && viewerRef.current) {
            console.log("Showing viewer");
            viewerRef.current.show();
        }
    }, [shouldShowViewer]);

    return (
        <div className="mt-2 flex flex-col gap-2">
            <p className="m-0 form-field-label font-medium">{fieldLabel}</p>

            {value ? (
                <div className="flex gap-3 items-center">
                    {(isImage || isPDF) && (
                        <Button
                            icon="pi pi-eye"
                            type="button"
                            style={{ minWidth: 66 }}
                            loading={isLoading}
                            tooltip={value}
                            disabled={isLoading}
                            label={`View ${fileType}`}
                            size="small"
                            iconPos="left"
                            onClick={handleView}
                        />
                    )}
                    {downloadAllowed && (
                        <Button
                            size="small"
                            type="button"
                            icon="pi pi-download"
                            tooltip={`Download ${value?.split("/").pop()}`}
                            loading={isLoading}
                            onClick={handleDownload}
                            disabled={isLoading}
                            className='solid-icon-button' />
                    )}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">No file uploaded</p>
            )}

            {/* Hidden image for Viewer.js - keep visibility hidden instead of display none */}
            {isImage && previewUrl && (
                <img
                    ref={imageRef}
                    src={previewUrl}
                    alt={value}
                    style={{ 
                        position: "absolute",
                        visibility: "hidden",
                        width: "1px",
                        height: "1px"
                    }}
                />
            )}

            <Dialog
                header={value}
                visible={open}
                modal
                style={{ width: "80vw", maxHeight: "90vh" }}
                onHide={() => setOpen(false)}
                headerClassName='p-1 form-wrapper-title'
                contentClassName='p-0'
                contentStyle={{ borderRadius: 6 }}
            >
                {previewUrl && isPDF && (
                    <div
                        style={{
                            width: "100%",
                            height: "75vh",
                            overflow: "hidden",
                        }}
                    >
                        <iframe
                            src={previewUrl}
                            style={{ width: "100%", height: "100%", border: "none" }}
                        />
                    </div>
                )}
            </Dialog>
        </div>
    );
};