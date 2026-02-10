import { useEffect, useState } from "react";
import { Card } from "primereact/card";
import { ProgressSpinner } from "primereact/progressspinner";
import { useRouter } from "../../../hooks/useRouter";
import { useSearchParams } from "../../../hooks/useSearchParams";
import { signIn } from "../../../adapters/auth/signIn";

export function SsoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fn = async () => {
      const email = "";
      const password = "";
      const accessToken = searchParams.get("accessToken");
      const response = await signIn("credentials", {
        redirect: false,
        email,
        password,
        accessToken,
      });

      if (response?.error) {
        setIsLoading(false);
        setError(response.error);
      } else {
        setIsLoading(false);
        setSuccess(true);
        router.push("/admin");
      }
    };

    fn();
  }, [router, searchParams]);

  return (
    <div className="card flex justify-content-center align-items-center" style={{ height: "80vh" }}>
      <Card
        className="custom-card md:w-25rem"
        style={{
          boxShadow:
            "rgba(0, 0, 0, 0.16) 0px 10px 36px 0px, rgba(0, 0, 0, 0.06) 0px 0px 0px 1px",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          {isLoading ? (
            <>
              <ProgressSpinner style={{ width: "50px", height: "50px" }} />
              <style>{`
                .p-progress-spinner circle {
                  stroke: blue !important;
                }
              `}</style>
            </>
          ) : success ? (
            <i className="pi pi-check" style={{ color: "green", fontSize: "30px", fontWeight: "700" }}></i>
          ) : (
            <i className="pi pi-times" style={{ color: "red", fontSize: "30px", fontWeight: "700" }}></i>
          )}
        </div>
        <p className="m-20" style={{ textAlign: "center" }}>
          {isLoading && `Please wait while we authenticate your profile.`}
          {error && `${error} Your not authenticated`}
        </p>
      </Card>
    </div>
  );
}
