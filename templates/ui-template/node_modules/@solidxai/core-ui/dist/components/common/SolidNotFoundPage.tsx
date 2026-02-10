import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { useRouter } from "../../hooks/useRouter";

type SolidNotFoundPageProps = {
  title?: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
};

export const SolidNotFoundPage = ({
  title = "Not Found",
  message = "Requested resource is not available.",
  actionLabel = "Go to Dashboard",
  actionHref = "/admin",
}: SolidNotFoundPageProps) => {
  const router = useRouter();

  return (
    <div className="flex align-items-center justify-content-center" style={{ minHeight: "70vh" }}>
      <Card className="w-full" style={{ maxWidth: 420 }}>
        <div className="flex flex-column align-items-center text-center gap-3">
          <div className="text-xl font-bold" style={{ color: "#3b82f6" }}>404</div>
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
