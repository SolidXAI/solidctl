import { Card } from "primereact/card";

export function AboutPage() {
  return (
    <div className="flex align-items-center justify-content-center" style={{ minHeight: "70vh" }}>
      <Card className="w-full" style={{ maxWidth: 520 }}>
        <div className="flex flex-column align-items-center text-center gap-2">
          <i className="pi pi-info-circle" style={{ fontSize: 28, color: "#2563eb" }} />
          <h2 className="m-0">About Us</h2>
          <p className="m-0 text-sm">
            This is a public, unguarded route outside the auth layout.
          </p>
        </div>
      </Card>
    </div>
  );
}
