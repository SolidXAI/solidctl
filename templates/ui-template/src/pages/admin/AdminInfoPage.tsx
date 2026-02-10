import { Card } from "primereact/card";

export function AdminInfoPage() {
  return (
    <div className="flex align-items-center justify-content-center" style={{ minHeight: "70vh" }}>
      <Card className="w-full" style={{ maxWidth: 520 }}>
        <div className="flex flex-column align-items-center text-center gap-2">
          <i className="pi pi-shield" style={{ fontSize: 28, color: "#22c55e" }} />
          <h2 className="m-0">Admin Message</h2>
          <p className="m-0 text-sm">This is a guarded admin route.</p>
        </div>
      </Card>
    </div>
  );
}
