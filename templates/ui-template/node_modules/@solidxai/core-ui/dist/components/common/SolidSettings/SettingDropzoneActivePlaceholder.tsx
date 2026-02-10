import { Button } from 'primereact/button'
import React from 'react'

export const SettingDropzoneActivePlaceholder = ({note}:any) => {
    return (
        <div className='solid-dropzone'>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M11 16V7.85L8.4 10.45L7 9L12 4L17 9L15.6 10.45L13 7.85V16H11ZM6 20C5.45 20 4.97917 19.8042 4.5875 19.4125C4.19583 19.0208 4 18.55 4 18V15H6V18H18V15H20V18C20 18.55 19.8042 19.0208 19.4125 19.4125C19.0208 19.8042 18.55 20 18 20H6Z" fill="#666666" />
            </svg>
            <div className='font-bold mt-2 text-center'>
                Drag and Drop or <span className='text-primary'> Logo</span> to upload
            </div>
            <p className='text-center'>Supported format:PNG, JPG, JPEG, SVG, WEBP | Max size: 2 MB</p>
            <small className='mb-2 text-center'>Note: {note ? note : "200px image width is ideal"}</small>
            <div>
                <Button outlined size='small' severity='secondary' label='Click to Browse' type="button" />
            </div>
        </div>
    )
}