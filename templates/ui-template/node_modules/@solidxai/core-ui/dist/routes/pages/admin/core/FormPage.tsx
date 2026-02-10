import SolidFormLayouts from "../../../../components/core/form/SolidFormLayouts";
import { useParams } from "react-router-dom";

export function FormPage() {
  const params = useParams();
  return <SolidFormLayouts params={params} />;
}
