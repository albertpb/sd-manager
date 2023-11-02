import classNames from 'classnames';
import Image from './Image';
import Rating from './Rating';

type ModelCardProps = {
  id: string;
  imagePath: string;
  name: string;
  width?: string;
  height?: string;
  rating?: number;
  imageClassName?: any;
  figureClassName?: any;
  type: string;
  loading?: boolean;
  needUpdate?: boolean;
  className?: any;
  showRating?: boolean;
};

export default function ModelCard({
  id,
  imagePath,
  name,
  rating,
  width = '480px',
  height = '320px',
  imageClassName = 'object-cover',
  figureClassName = '',
  className = '',
  type,
  loading = false,
  needUpdate = false,
  showRating = true,
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
        className,
      ])}
      style={{ width, height }}
    >
      {loading && loadingOverlay}
      <figure
        className={classNames([
          'card__figure rounded-md overflow-hidden',
          { animated: !loading },
          { 'blur-sm': loading },
          figureClassName,
        ])}
        style={{ width, height }}
      >
        <Image
          src={imagePath}
          alt={name}
          height="100%"
          width="100%"
          className={classNames([imageClassName])}
        />
        <div className="absolute top-2 left-0 w-full z-20">
          <div className="flex flex-row justify-between">
            <div className="w-full h-full flex px-3 mt-1 flex-col">
              <div className="badge badge-accent mb-2">{type}</div>
              {needUpdate ? (
                <div className="badge badge-warning mb-2">Update Available</div>
              ) : null}
            </div>
            {showRating && (
              <div className="sm:hidden md:hidden lg:block pr-2">
                <Rating id={`model-card-rating-${id}`} value={rating || 1} />
              </div>
            )}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full p-3 flex ">
          <p className="text-xl font-bold text-white">{name}</p>
        </div>
      </figure>
    </div>
  );
}
