import React, { useEffect, useRef, useState } from "react";

interface SolidXAiIframeProps {
  url: string;
}

export const SolidXAiIframe: React.FC<SolidXAiIframeProps> = ({ url }) => {
  const [reachable, setReachable] = useState<boolean | null>(null);


  useEffect(() => {
  const handler = (event:any) => {
    if (event.data?.action === "REFRESH_PARENT") {
      window.location.reload();
    }
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}, []);



  useEffect(() => {
    const checkServer = async () => {
      try {
        // Try to fetch the page HEAD (fast, no content)
        const res = await fetch(url, { method: "HEAD" });

        if (res.ok) {
          setReachable(true);
        } else {
          setReachable(false);
        }
      } catch (err) {
        setReachable(false);
      }
    };

    checkServer();
  }, [url]);

  // Loading state
  if (reachable === null) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600">
        Checking SolidX AI server...
      </div>
    );
  }

  // Error state
  if (reachable === false) {
    return (
      <div className="flex  items-center justify-center align-items-center h-full text-center p-4 overflow-x-auto	">
        <h3>Mcp Server not reachable. <br></br>
          <span className="opacity-60 mt-2">
            <strong>{url}</strong>
          </span>
        </h3>
      </div>
    );
  }
  // SUCCESS → load iframe
  return (
    <iframe
      src={url}
      style={{
        width: "100%",
        height: "100%",
        border: "none",
      }}
      allow="clipboard-write; clipboard-read"
      title="SolidX AI JSON Viewer"
    />
  );
};
