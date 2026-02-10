import { SolidUiEvent, SolidViewLayoutManager } from '@solidxai/core-ui';

const handleVenueUserFormViewLoad = (event: SolidUiEvent) => {
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

    // Hide leader, regionHead, areaHead, venueManager, manager fields when it's a new form
    if (isNewForm) {
        layoutManager.updateNodeAttributes('code', { visible: false });
        layoutManager.updateNodeAttributes('internalExternal', { visible: false });
        layoutManager.updateNodeAttributes('designation', { visible: false });
        layoutManager.updateNodeAttributes('exitStatus', { visible: false });
        layoutManager.updateNodeAttributes('doj', { visible: false });
        layoutManager.updateNodeAttributes('dol', { visible: false });
        layoutManager.updateNodeAttributes('lastImportedOn', { visible: false });
        layoutManager.updateNodeAttributes('leader', { visible: false });
        layoutManager.updateNodeAttributes('regionHead', { visible: false });
        layoutManager.updateNodeAttributes('zonalHead', { visible: false });
        layoutManager.updateNodeAttributes('areaHead', { visible: false });
        layoutManager.updateNodeAttributes('venueManager', { visible: false });
        layoutManager.updateNodeAttributes('manager', { visible: false });

        if (isEditMode) {
            layoutManager.updateNodeAttributes('code', {
                visible: true,
                disabled: true
            });
            layoutManager.updateNodeAttributes('internalExternal', {
                visible: true,
                disabled: true
            });
            layoutManager.updateNodeAttributes('designation', {
                visible: true,
                disabled: true
            });
            layoutManager.updateNodeAttributes('exitStatus', {
                visible: true,
                disabled: true
            });
            layoutManager.updateNodeAttributes('doj', {
                visible: true,
                disabled: true
            });
            layoutManager.updateNodeAttributes('dol', {
                visible: true,
                disabled: true
            });
            layoutManager.updateNodeAttributes('lastImportedOn', {
                visible: true,
                disabled: true
            });
            layoutManager.updateNodeAttributes('leader', {
                visible: true,
                disabled: true
            });
            layoutManager.updateNodeAttributes('regionHead', {
                visible: true,
                disabled: true
            });
            layoutManager.updateNodeAttributes('zonalHead', {
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
export default handleVenueUserFormViewLoad;
