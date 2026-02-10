import React from "react";

type ImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  fill?: boolean;
  unoptimized?: boolean;
};

export default function Image({ src, alt, fill, unoptimized, ...rest }: ImageProps) {
  // 'fill' and 'unoptimized' are Next.js Image props; ignore for <img>.
  return <img src={src} alt={alt} {...rest} />;
}
