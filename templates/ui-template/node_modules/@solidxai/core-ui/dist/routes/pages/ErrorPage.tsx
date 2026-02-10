import { SolidErrorPage } from "../../components/common/SolidErrorPage";

export function ErrorPage() {
  const message = sessionStorage.getItem("solidx.globalError") || undefined;
  return <SolidErrorPage message={message} />;
}
