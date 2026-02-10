import { SolidViewLayoutManager } from "../../../../../components/core/common/SolidViewLayoutManager";

const hanldeEmailFormTypeLoad = (event: any) => {

    const { formData, type, viewMetadata } = event;
    const layout = viewMetadata.layout;
    if (formData?.type && type === 'onFormLayoutLoad') {
        const layoutManager = new SolidViewLayoutManager(layout);
        const renderMode = formData.type === 'text' ? 'DefaultLongTextFormEditWidget' : 'DefaultRichTextFormEditWidget';
        layoutManager.updateNodeAttributes('body', { "editWidget": renderMode});
        return {
            layoutChanged: true,
            dataChanged: false,
            newLayout: layoutManager.getLayout(), 
        }
    }
}
export default hanldeEmailFormTypeLoad;
