import { SolidKanbanView } from "../../../../components/core/kanban/SolidKanbanView";
import { camelCase } from "change-case";
import { useParams } from "react-router-dom";

export function KanbanPage() {
  const params = useParams();
  const moduleName = params.moduleName || "";
  const modelName = params.modelName ? camelCase(params.modelName) : "";
  return <SolidKanbanView {...params} embeded={false} moduleName={moduleName} modelName={modelName} />;
}
