import classNames from 'classnames';
import { useEffect, useState } from 'react';

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
  const [loading, setLoading] = useState<boolean>(true);
  const [image, setImage] = useState('');

  useEffect(() => {
    const load = async () => {
      const { base64 } = await window.ipcHandler.readImage(src);
      setImage(base64);
      setLoading(false);
    };

    load();
  }, [src]);

  if (loading) return null;

  return (
    <img
      src={`data:image/png;base64,${image}`}
      alt={alt}
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
