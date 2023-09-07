import { IpcRendererEvent } from 'electron';
import { ImageRow } from 'main/ipc/organizeImages';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Image from 'renderer/components/Image';
import Rating from 'renderer/components/Rating';
import VirtualScroll, {
  VirtualScrollData,
} from 'renderer/components/VirtualScroll';

interface RowData {
  row: ImageRow[];
  id: string;
}

export default function Images() {
  const navigate = useNavigate();

  const [loaded, setLoaded] = useState<boolean>(false);
  const [images, setImages] = useState<ImageRow[]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);

  const [width, setWidth] = useState(320);
  const [height, setHeight] = useState(480);
  const [perChunk, setPerChunk] = useState(4);
  const [buffer, setBuffer] = useState(3);
  const rowMargin = 10;

  useEffect(() => {
    const load = async () => {
      if (!loaded) {
        const imagesRows = await window.ipcHandler.getImages();
        setImages(imagesRows);

        setLoaded(true);
      }
    };
    load();
  }, [loaded]);

  const calcImagesValues = useCallback(() => {
    const windowHeight = window.innerHeight;
    setContainerHeight(windowHeight - 150);

    const cardHeight = containerHeight / 3 - rowMargin;
    const cardWidth = (cardHeight * 2) / 3;
    setHeight(cardHeight);
    setWidth(cardWidth);
    setBuffer(Math.floor(containerHeight / cardHeight));

    setPerChunk(
      Math.floor((window.innerWidth - window.innerHeight * 0.2) / cardWidth)
    );
  }, [containerHeight]);

  const setRef = useCallback(
    (node: HTMLDivElement) => {
      containerRef.current = node;
      calcImagesValues();
    },
    [calcImagesValues]
  );

  useEffect(() => {
    calcImagesValues();

    window.addEventListener('resize', calcImagesValues);

    return () => window.removeEventListener('resize', calcImagesValues);
  }, [containerRef, width, calcImagesValues]);

  useEffect(() => {
    const cb = (event: IpcRendererEvent, imagesData: ImageRow) => {
      setImages([imagesData, ...images]);
    };

    window.ipcOn.detectedAddImage(cb);

    return () => window.ipcOn.rmDetectedAddImage(cb);
  }, [images]);

  const chunks = images.reduce((resultArr: RowData[], image, index) => {
    const chunkIndex = Math.floor(index / perChunk);

    if (!resultArr[chunkIndex]) {
      resultArr[chunkIndex] = {
        id: '',
        row: [],
      };
    }

    resultArr[chunkIndex].row.push(image);
    resultArr[chunkIndex].id = image.hash;
    return resultArr;
  }, []);

  const onClick = (hash: string) => {
    navigate(`/image-detail/${hash}`);
  };

  const rowRenderer = (row: VirtualScrollData) => {
    const items = row.row.map((image: ImageRow) => {
      return (
        <div
          id={`${image.hash}`}
          key={`${image.hash}`}
          className="cursor-pointer"
          onClick={() => onClick(image.hash)}
          aria-hidden="true"
        >
          <figure
            className="card__figure rounded-md overflow-hidden relative"
            style={{
              width: `${width}px`,
              height: `${height}px`,
              marginRight: `${rowMargin}px`,
            }}
          >
            <div className="absolute top-2 right-2 z-20">
              <Rating value={image.rating} />
            </div>
            <Image
              src={`${image.path}\\${image.name}.thumbnail.png`}
              alt={`model_detail_model_image_${image.hash}`}
              height="100%"
              width="100%"
              className="object-cover"
            />
            <div className="absolute bottom-0 left-0 w-full p-3 flex flex-col">
              <p className="text font-bold text-white">{image.model}</p>
              <p className="text font-bold text-white">{image.name}</p>
            </div>
          </figure>
        </div>
      );
    });

    return (
      <div key={row.id} className="flex w-full">
        {items}
      </div>
    );
  };

  return (
    <div ref={setRef} className="W-full h-full">
      <VirtualScroll
        data={chunks}
        settings={{
          buffer,
          rowHeight: height,
          tolerance: 3,
          rowMargin,
        }}
        rowRenderer={rowRenderer}
      />
    </div>
  );
}
