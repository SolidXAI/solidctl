import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { useRouter } from "../../hooks/useRouter";

type SolidErrorPageProps = {
  title?: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
};

export const SolidErrorPage = ({
  title = "Error Occurred",
  message = "Something went wrong.",
  actionLabel = "Go to Dashboard",
  actionHref = "/admin",
}: SolidErrorPageProps) => {
  const router = useRouter();

  return (
    <div className="flex align-items-center justify-content-center" style={{ minHeight: "70vh" }}>
      <Card className="w-full" style={{ maxWidth: 420 }}>
        <div className="flex flex-column align-items-center text-center gap-3">
          <i className="pi pi-exclamation-circle" style={{ fontSize: 28, color: "#e91e63" }} />
          <h2 className="m-0">{title}</h2>
          <p className="m-0 text-sm">{message}</p>
          <Button
            label={actionLabel}
            link
            onClick={() => router.push(actionHref)}
            className="mt-2"
          />
        </div>
      </Card>
    </div>
  );
};
