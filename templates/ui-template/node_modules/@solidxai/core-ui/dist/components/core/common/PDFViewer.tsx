

import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Local worker recommended (avoids CORS)
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function PDFViewer({ url }: any) {
    const [numPages, setNumPages] = useState<any>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);

    // Convert signed URL → Blob → Object URL
    useEffect(() => {
        if (!url) return;

        setLoading(true);
        setError(null);

        fetch(url)
            .then(async (res) => {
                if (!res.ok) throw new Error("Failed to fetch PDF");

                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                setBlobUrl(blobUrl);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Blob fetch error:", err);
                setError("Failed to load PDF");
                setLoading(false);
            });
    }, [url]);

    function onDocumentLoadSuccess({ numPages }: any) {
        setNumPages(numPages);
        setError(null);
    }

    function onDocumentLoadError(err: any) {
        console.error("PDF load error:", err);
        setError("Failed to render PDF");
    }

    const goToPrevPage = () => setPageNumber((p) => Math.max(p - 1, 1));
    const goToNextPage = () => setPageNumber((p) => Math.min(p + 1, numPages));

    if (!url) {
        return (
            <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                <p className="text-gray-500">No PDF URL provided</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center space-y-4 p-4">
            {loading && (
                <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg w-full">
                    <p className="text-gray-600">Loading PDF...</p>
                </div>
            )}

            {error && (
                <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg w-full">
                    <p className="text-red-600">{error}</p>
                </div>
            )}

            {/* Render only after Blob URL is created */}
            {blobUrl && !loading && !error && (
                <Document
                    file={blobUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    className="border border-gray-300 rounded-lg shadow-lg"
                >
                    <Page
                        pageNumber={pageNumber}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                    />
                </Document>
            )}

            {numPages && (
                <div className="flex items-center space-x-4 bg-white p-4 rounded-lg shadow-md">
                    <button
                        onClick={goToPrevPage}
                        disabled={pageNumber <= 1}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>

                    <span className="text-gray-700 font-medium">
                        Page {pageNumber} of {numPages}
                    </span>

                    <button
                        onClick={goToNextPage}
                        disabled={pageNumber >= numPages}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
