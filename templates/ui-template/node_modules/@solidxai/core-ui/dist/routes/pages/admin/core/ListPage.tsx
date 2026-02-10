import { SolidListView } from "../../../../components/core/list/SolidListView";
import { camelCase } from "change-case";
import { useParams } from "react-router-dom";

export function ListPage() {
  const params = useParams();
  const moduleName = params.moduleName || "";
  const modelName = params.modelName ? camelCase(params.modelName) : "";
  return <SolidListView {...params} embeded={false} moduleName={moduleName} modelName={modelName} />;
}
