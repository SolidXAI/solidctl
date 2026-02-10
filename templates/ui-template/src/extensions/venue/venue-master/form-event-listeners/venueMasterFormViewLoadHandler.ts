import { SolidUiEvent, SolidViewLayoutManager } from '@solidxai/core-ui';

const handleVenueMasterFormViewLoad = (event: SolidUiEvent) => {

    const { viewMetadata } = event;
    console.log("handleVenueMasterFormViewLoad handler", viewMetadata);

    const layout = viewMetadata.layout;
    const layoutManager = new SolidViewLayoutManager(layout);

    const currentUrl = window.location.href;
    const isNewForm = currentUrl.endsWith('/new');

    const urlParams = new URLSearchParams(window.location.search);
    const viewMode = urlParams.get('viewMode');
    const isViewMode = viewMode === 'view';
    const isEditMode = viewMode === 'edit';

    // Hide leader, regionHead, areaHead, venueManager, manager fields when it's a new form
    if (isNewForm) {
        layoutManager.updateNodeAttributes('leader', { visible: false });
        layoutManager.updateNodeAttributes('regionHead', { visible: false });
        layoutManager.updateNodeAttributes('areaHead', { visible: false });
        layoutManager.updateNodeAttributes('venueManager', { visible: false });
        layoutManager.updateNodeAttributes('manager', { visible: false });

        if (isEditMode) {
            layoutManager.updateNodeAttributes('leader', {
                visible: true,
                disabled: true
            });
            layoutManager.updateNodeAttributes('regionHead', {
                visible: true,
                disabled: true
            });
            layoutManager.updateNodeAttributes('areaHead', {
                visible: true,
                disabled: true
            });
            layoutManager.updateNodeAttributes('venueManager', {
                visible: true,
                disabled: true
            });
            layoutManager.updateNodeAttributes('manager', {
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
}
export default handleVenueMasterFormViewLoad;
