import classNames from 'classnames';
import placeHolderImage from '../../../assets/images/notfound.jpg';

type ImageProps = {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
};

export default function Image({
  src,
  alt,
  width,
  height,
  className,
}: ImageProps) {
  return (
    <img
      src={`sd:///${src}`}
      alt={alt}
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = placeHolderImage;
      }}
      width={width}
      height={height}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      className={classNames(className)}
    />
  );
}
