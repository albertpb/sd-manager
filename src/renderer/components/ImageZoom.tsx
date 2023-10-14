import React, { createRef, useCallback } from 'react';
import QuickPinchZoom, { make3dTransformValue } from 'react-quick-pinch-zoom';

export default function ImageZoom({ src, alt }: { src: string; alt: string }) {
  const imgRef = createRef<HTMLImageElement>();
  const onUpdate = useCallback(
    ({ x, y, scale }: { x: number; y: number; scale: number }) => {
      const { current: img } = imgRef;

      if (img) {
        const value = make3dTransformValue({ x, y, scale });

        img.style.setProperty('transform', value);
      }
    },
    [imgRef]
  );

  return (
    <div className="tooltip" data-tip="Use ctrl + wheel to zoom in/out">
      <QuickPinchZoom onUpdate={onUpdate} wheelScaleFactor={500}>
        <img ref={imgRef} src={src} alt={alt} />
      </QuickPinchZoom>
    </div>
  );
}
