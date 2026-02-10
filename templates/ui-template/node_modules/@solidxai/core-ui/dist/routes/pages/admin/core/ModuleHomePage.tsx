import { SolidModuleHome } from "../../../../components/common/SolidModuleHome";
import { useParams } from "react-router-dom";

export function ModuleHomePage() {
  const params = useParams();
  return <SolidModuleHome {...params} />;
}
