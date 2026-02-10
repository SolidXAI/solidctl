import { SolidLoadForm, SolidViewLayoutManager } from "@solidxai/core-ui";

const onHierarchyImportFormLayoutLoadHandler = async (event: SolidLoadForm) => {
    const { viewMetadata } = event;

    const layout = viewMetadata.layout;
    const layoutManager = new SolidViewLayoutManager(layout);

    const currentUrl = window.location.href;

    const { pathname } = new URL(currentUrl);
    const isNewForm = pathname.endsWith('/new');

    const urlParams = new URLSearchParams(window.location.search);
    const viewMode = urlParams.get('viewMode');
    const isViewMode = viewMode === 'view';
    const isEditMode = viewMode === 'edit';

    // Hide errorDetails field when it's a new form
    if (isNewForm) {
        layoutManager.updateNodeAttributes('errorDetails', {
            visible: false
        });

        layoutManager.updateFormButtonByAction('ImportHierarchyComponent', {
            visible: false
        });
    }

    if (isEditMode) {
        layoutManager.updateNodeAttributes('errorDetails', {
            visible: true,
            disabled: true
        });
    }

    return {
        layoutChanged: isNewForm || isViewMode || isEditMode,
        dataChanged: false,
        newLayout: layoutManager.getLayout()
    }

}

export default onHierarchyImportFormLayoutLoadHandler;
