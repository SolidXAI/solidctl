import { closePopup } from '@solidxai/core-ui';
import { Button } from 'primereact/button'
import React from 'react'
import { useDispatch } from 'react-redux';

export const SolidCustomImportHeader = () => {
    const dispatch = useDispatch();
    return (
        <div className='px-4 py-2 secondary-border-bottom flex align-items-center justify-content-between'>
            <h5 className='m-0'>Import Hierarchy</h5>
            <Button icon="pi pi-times" onClick={() => dispatch(closePopup())} size='small' severity='secondary' text style={{ height: 30, width: 30 }} />
        </div>
    )
}