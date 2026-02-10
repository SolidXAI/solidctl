import { Dialog } from "primereact/dialog";
import { camelCase } from "lodash";
import SolidFormView from "../../../../../../../components/core/form/SolidFormView";

export const InlineRelationEntityDialog = ({ visible, setVisible, fieldContext, onCreate }: any) => {
  const fieldLayoutInfo = fieldContext.field;

  const params = {
    moduleName: fieldContext.fieldMetadata.relationModelModuleName,
    id: "new",
    embeded: true,
    customLayout: fieldLayoutInfo?.attrs?.inlineCreateLayout,
    customCreateHandler: (values: any) => {
      setVisible(false);
      onCreate(values);
    },
    inlineCreateAutoSave: fieldLayoutInfo?.attrs?.inlineCreateAutoSave,
    handlePopupClose: () => setVisible(false),
    modelName: camelCase(fieldContext.fieldMetadata.relationCoModelSingularName)
  };

  return (
    <Dialog
      visible={visible}
      showHeader={false}
      style={{
      width: fieldLayoutInfo?.attrs?.inlineCreateLayout?.attrs?.width ?? "60vw",
      height: fieldLayoutInfo?.attrs?.inlineCreateLayout?.attrs?.height ?? "auto"
      }}
      // breakpoints={{ '1199px': '35rem', "767px": '85vw', "550px": '90vw' }}

      onHide={() => setVisible(false)}
      className="solid-dialog"
    >
      <SolidFormView {...params} />
    </Dialog>
  );
};
