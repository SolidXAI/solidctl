import { Button } from 'primereact/button'
import React from 'react'

export const SettingsImageRemoveButton = ({ onClick }: any) => {
    return (
        <Button
            label="Remove"
            severity="danger"
            icon="pi pi-times"
            size="small"
            className="mt-2"
            onClick={onClick}
        />
    )
}