import classNames from 'classnames';
import { MouseEvent, createRef, useCallback } from 'react';
import QuickPinchZoom, { make3dTransformValue } from 'react-quick-pinch-zoom';
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
  const onUpdate = useCallback(
    ({ x, y, scale }: { x: number; y: number; scale: number }) => {
      const { current: img } = imgRef;

      if (img) {
        const value = make3dTransformValue({ x, y, scale });

        img.style.setProperty('transform', value);
      }
    },
    [imgRef],
  );

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
      <QuickPinchZoom
        onUpdate={onUpdate}
        wheelScaleFactor={500}
        onDragStart={() => ondragstart()}
      >
        <Image
          ref={imgRef}
          src={src}
          alt={alt}
          className={imgClassName}
          width={width}
          height={height}
        />
      </QuickPinchZoom>
    </div>
  );
}
