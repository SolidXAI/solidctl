import { Card } from "primereact/card";
import { Message } from "primereact/message";
import { env } from "../../adapters/env";

export const SolidAdmin = () => {
  const redirectUrl = env("NEXT_PUBLIC_LOGIN_REDIRECT_URL");
  const hasRedirect = Boolean(redirectUrl);

  return (
    <div className="flex align-items-center justify-content-center" style={{ minHeight: "60vh" }}>
      <div className="w-full" style={{ maxWidth: 720 }}>
        {!hasRedirect && (
          <div className="mb-3">
            <Message
              severity="warn"
              text="Default redirect URL is not configured. Please ask your system administrator to set VITE_LOGIN_REDIRECT_URL."
            />
          </div>
        )}
        {hasRedirect && (<Card title="Welcome to SolidX">
          <p className="m-0">
            SolidX is the admin console for managing modules, models, views, and permissions. Use the
            left navigation to explore modules, configure settings, and build your app.
          </p>
        </Card>)}
      </div>
    </div>
  );
};
