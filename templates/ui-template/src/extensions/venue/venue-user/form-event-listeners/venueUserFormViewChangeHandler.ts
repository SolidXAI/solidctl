import { SolidUiEvent, SolidViewLayoutManager } from '@solidxai/core-ui';

const handleVenueUserFormViewChange = (event: SolidUiEvent) => {

    const { modifiedField, modifiedFieldValue, formViewLayout } = event;

    const layout = formViewLayout;
    const layoutManager = new SolidViewLayoutManager(layout);

    if (modifiedField === 'code') {        
        return {
            layoutChanged: false,
            dataChanged: true,
            newFormData: {
                username: modifiedFieldValue
            },
            newLayout: layoutManager.getLayout(),
        }
    }
}
export default handleVenueUserFormViewChange;
