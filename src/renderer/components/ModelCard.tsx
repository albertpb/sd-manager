import classNames from 'classnames';
import Image from './Image';
import Rating from './Rating';

type ModelCardProps = {
  imagePath: string;
  name: string;
  width?: string;
  height?: string;
  rating?: number;
  imageClassName?: any;
  type: string;
  loading?: boolean;
  needUpdate?: boolean;
};

export default function ModelCard({
  imagePath,
  name,
  rating,
  width = '480px',
  height = '320px',
  imageClassName = 'object-cover',
  type,
  loading = false,
  needUpdate = false,
}: ModelCardProps) {
  const loadingOverlay = (
    <div className="absolute top-0 right-0 w-full h-full flex justify-center items-center text-primary flex-col z-50">
      <span className="loading loading-ring loading-lg" />
      <div>Checking . . .</div>
    </div>
  );

  return (
    <div
      className={classNames([
        'relative overflow-hidden rounded-md p-0 m-2 cursor-pointer',
      ])}
      style={{ width, height }}
    >
      {loading && loadingOverlay}
      <figure
        className={classNames([
          'card__figure rounded-md overflow-hidden',
          { animate: !loading },
          { 'blur-sm': loading },
        ])}
        style={{ width, height }}
      >
        <div className="absolute top-2 right-2 z-20">
          <Rating value={rating || 1} />
        </div>
        <Image
          src={imagePath}
          alt={name}
          height="100%"
          width="100%"
          className={classNames([imageClassName])}
        />
        <div className="absolute top-0 left-0 w-full">
          <div className="w-full h-full flex p-3 flex-col">
            <div className="badge badge-accent mb-2">{type}</div>
            {needUpdate ? (
              <div className="badge badge-warning mb-2">Update Available</div>
            ) : null}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full p-3 flex ">
          <p className="text-xl font-bold text-white">{name}</p>
        </div>
      </figure>
    </div>
  );
}
