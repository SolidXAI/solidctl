
// components/PopupContainer.tsx
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../types/solid-core';
import { closePopup } from '../../redux/features/popupSlice';
import { Dialog } from 'primereact/dialog';
import { get } from 'lodash';
import { getExtensionComponent } from '../../helpers/registry';
import { Button } from 'primereact/button';


const SolidPopupContainer = () => {
    const { isOpen, event } = useSelector((state: RootState) => state.popup);
    const dispatch = useDispatch();

    if (!isOpen) return null;

    const DynamicComponent = getExtensionComponent(event?.action);

    return (
        <Dialog
            visible={isOpen}
            onHide={() => dispatch(closePopup())}
            closable={false}
            style={{ width: event.popupWidth ? event.popupWidth : '50vw' }}
            modal
            headerClassName='p-0'
            contentClassName='p-0'
            contentStyle={{ borderRadius: 6 }}
            className='solid-common-dialog'
        >
            {DynamicComponent && <DynamicComponent {...event} />}
        </Dialog>
    );
};

export default SolidPopupContainer;
