import { MouseEvent } from 'react';
import classNames from 'classnames';
import { Tag } from 'main/ipc/tag';
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
  hoverEffect?: boolean;
  showName?: boolean;
  showBadge?: boolean;
  onDragPath?: string;
  onRatingChange?: (event: MouseEvent<HTMLInputElement>, value: number) => void;
  tags?: Tag[];
  onClick: (e: MouseEvent<HTMLDivElement>) => void;
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
  hoverEffect = true,
  showName = true,
  showBadge = true,
  onDragPath,
  onRatingChange,
  tags,
  onClick,
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
        'cursor-pointer overflow-hidden rounded-md py-2 w-fit',
        className,
      ])}
      onClick={(e) => onClick(e)}
      aria-hidden
    >
      {loading && loadingOverlay}
      <figure
        className={classNames([
          'card__figure rounded-md overflow-hidden relative',
          { animated: !loading && hoverEffect },
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
          onDragPath={onDragPath}
        />
        <div className="absolute top-2 left-0 w-full z-20">
          <div className="flex flex-row justify-between">
            <div className="w-full h-full flex px-3 mt-1 flex-col">
              {showBadge && (
                <>
                  <div className="badge badge-accent mb-2">{type}</div>
                  {tags?.map((tag) => (
                    <div
                      key={`model-tag-${tag.id}-${id}`}
                      className="badge badge-accent mb-2"
                      style={{
                        color: tag?.color,
                        background: tag?.bgColor,
                      }}
                    >
                      {tag?.label}
                    </div>
                  ))}
                </>
              )}
              {needUpdate && (
                <div className="badge badge-warning mb-2">update</div>
              )}
            </div>
            {showRating && (
              <div className="sm:hidden md:hidden lg:block pr-2">
                <Rating
                  id={`model-card-rating-${id}`}
                  value={rating || 1}
                  onClick={onRatingChange}
                />
              </div>
            )}
          </div>
        </div>
        {showName && (
          <div className="absolute bottom-0 left-0 w-full p-3 flex ">
            <p className="text-xl font-bold text-white truncate">{name}</p>
          </div>
        )}
      </figure>
    </div>
  );
}
