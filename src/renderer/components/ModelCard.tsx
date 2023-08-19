import Image from './Image';

type ModelCardProps = {
  imagePath: string;
  name: string;
};

export default function ModelCard({ imagePath, name }: ModelCardProps) {
  return (
    <div className="relative overflow-hidden rounded-md p-0 m-1 shadow cursor-pointer">
      <figure className="card__figure">
        <Image src={imagePath} alt={name} width="100%" />
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
