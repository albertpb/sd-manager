import Image from './Image';
import Rating from './Rating';

type ModelCardProps = {
  imagePath: string;
  name: string;
  width?: string;
  height?: string;
  rating?: number;
};

export default function ModelCard({
  imagePath,
  name,
  rating,
  width = '480px',
  height = '320px',
}: ModelCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-md p-0 m-2 cursor-pointer"
      style={{ width, height }}
    >
      <figure
        className="card__figure rounded-md overflow-hidden relative"
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
          className="object-cover"
        />
        <div className="absolute top-0 left-0 w-full">
          <div className="w-full h-full flex flex-row p-3">
            <div className="badge badge-accent">checkpoint</div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full p-3 flex ">
          <p className="text-xl font-bold text-white">{name}</p>
        </div>
      </figure>
    </div>
  );
}
