import { Card } from "primereact/card";

export function HelloAuthPage() {
  return (
    <div className="flex align-items-center justify-content-center" style={{ minHeight: "70vh" }}>
      <Card className="w-full" style={{ maxWidth: 420 }}>
        <div className="flex flex-column align-items-center text-center gap-3">
          <i className="pi pi-sparkles" style={{ fontSize: 28, color: "#7c3aed" }} />
          <h2 className="m-0">Hello!</h2>
          <p className="m-0 text-sm">This is an unguarded auth route.</p>
        </div>
      </Card>
    </div>
  );
}
