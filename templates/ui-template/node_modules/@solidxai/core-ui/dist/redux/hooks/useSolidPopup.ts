// hooks/usePopup.ts
import { useDispatch } from 'react-redux';
import { ReactNode } from 'react';
import { closePopup, openPopup } from '../features/popupSlice';

const useSolidPopup = () => {
    const dispatch = useDispatch();

    const showSolidPopup = (content: ReactNode) => {
        // dispatch(openPopup(content));
    };

    const hideSolidPopup = () => {
        // dispatch(closePopup());
    };

    return { showSolidPopup, hideSolidPopup };
};

export default useSolidPopup;
