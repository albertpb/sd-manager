import classNames from 'classnames';
import { MouseEvent, createRef } from 'react';
import Image from './Image';

type ImageZoomProps = {
  src: string;
  alt: string;
  className?: any;
  imgClassName?: any;
  width?: number | string;
  height?: number | string;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
};

export default function ImageZoom({
  src,
  alt,
  className,
  imgClassName,
  width,
  height,
  onClick,
}: ImageZoomProps) {
  const imgRef = createRef<HTMLImageElement>();

  const ondragstart = () => {
    window.ipcOn.startDrag(src);
  };

  return (
    <div
      className={classNames(['tooltip', className])}
      data-tip="Use ctrl + wheel to zoom in/out"
      onClick={(e) => onClick && onClick(e)}
      aria-hidden
    >
      <Image
        ref={imgRef}
        src={src}
        alt={alt}
        className={imgClassName}
        width={width}
        height={height}
      />
    </div>
  );
}
