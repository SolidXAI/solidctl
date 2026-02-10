import Image from "../Image"
import React from 'react'

export const SolidUploadedImage = ({ src, height, width, maxHeight, className }: any) => {
    return (
        <Image
            src={src}
            alt="App Logo"
            width={width ? width : 200}
            height={height ? height : 120}
            style={{ objectFit: "contain", maxHeight: maxHeight ? maxHeight : 150, maxWidth: '100%' }}
            unoptimized
            className={className}
        />
    )
}
