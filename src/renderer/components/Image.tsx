import { DragEvent, ForwardedRef, forwardRef } from 'react';
import { motion } from 'framer-motion';
import classNames from 'classnames';
import placeHolderImage from '../../../assets/images/notavailable.png';

type ImageProps = {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  onDragPath?: string;
};

export default forwardRef(
  (
    { src, alt, width, height, className, onDragPath }: ImageProps,
    ref: ForwardedRef<HTMLImageElement>,
  ) => {
    const ondragstart = (event: DragEvent<HTMLImageElement>) => {
      event.preventDefault();
      if (onDragPath) {
        window.ipcOn.startDrag(onDragPath);
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{
          opacity: 1,
          scale: 1,
          transition: { scale: { type: 'spring', duration: 0.5 } },
        }}
        className="w-full h-full"
      >
        <img
          ref={ref}
          src={`sd:///${src}`}
          alt={alt}
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = placeHolderImage;
          }}
          width={width}
          height={height}
          draggable={onDragPath !== undefined}
          onDragStart={(event) => ondragstart(event)}
          style={{
            width: typeof width === 'number' ? `${width}px` : width,
            height: typeof height === 'number' ? `${height}px` : height,
          }}
          className={classNames(className)}
        />
      </motion.div>
    );
  },
);
