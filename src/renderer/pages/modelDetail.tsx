import classNames from 'classnames';
import { ImageRow } from 'main/ipc/organizeImages';
import { useNavigate, useParams } from 'react-router-dom';
import { ModelInfo } from 'main/interfaces';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import ModelTableDetail from 'renderer/components/ModelTableDetail';
import { RootState } from 'renderer/redux';
import Carousel from 'react-multi-carousel';
import VirtualScroll, {
  VirtualScrollData,
} from 'renderer/components/VirtualScroll';
import Rating from 'renderer/components/Rating';
import Image from '../components/Image';

type Row = {
  id: string;
  path: string;
  hash: string | null;
  rating: number;
};
interface RowData {
  row: Row[];
  id: string;
}

export default function ModelDetail() {
  const navigate = useNavigate();
  const navigatorParams = useParams();
  const selectedModelName = navigatorParams.name;
  const selectedModelType = navigatorParams.type;

  const settings = useSelector((state: RootState) => state.global.settings);

  const [showHead, setShowHead] = useState<boolean>(true);
  const [containerHeight, setContainerHeight] = useState<number>(0);

  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [userImagesList, setUserImagesList] = useState<ImageRow[]>([]);
  const [modelImagesList, setModelImagesList] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const [width, setWidth] = useState(320);
  const [height, setHeight] = useState(480);
  const [perChunk, setPerChunk] = useState(4);
  const [buffer, setBuffer] = useState(3);
  const margin = 20;

  useEffect(() => {
    if (selectedModelName && selectedModelType) {
      const load = async () => {
        const mapPathsModels: Record<string, string | null> = {
          checkpoints: settings.checkpointsPath,
          loras: settings.lorasPath,
        };

        const modelsPath = mapPathsModels[selectedModelType];

        if (modelsPath) {
          const modelData = await window.ipcHandler.readFile(
            `${modelsPath}\\${selectedModelName}.civitai.info`,
            'utf-8'
          );
          if (modelData) {
            setModelInfo(JSON.parse(modelData));
          }

          const userImagesListsResponse: ImageRow[] =
            await window.ipcHandler.getImages(selectedModelName);
          setUserImagesList(userImagesListsResponse);

          const modelImagesListResponse =
            await window.ipcHandler.readdirModelImages(
              selectedModelName,
              modelsPath
            );
          setModelImagesList(modelImagesListResponse);
        }
      };
      load();
    }
  }, [settings, selectedModelName, selectedModelType]);

  useEffect(() => {
    window.ipcOn.detectedAddImage((event, imagesData: ImageRow) => {
      if (selectedModelName === imagesData.model) {
        setUserImagesList([imagesData, ...userImagesList]);
      }
    });
  }, [selectedModelName, userImagesList]);

  const calcImagesValues = useCallback(() => {
    const windowHeight = window.innerHeight;
    let rowsToShow = 1;

    if (showHead) {
      rowsToShow = 1;
      setContainerHeight(windowHeight - 750);
    } else {
      rowsToShow = 2;
      setContainerHeight(windowHeight - 350);
    }

    const cardHeight = containerHeight / rowsToShow - margin;
    const cardWidth = (cardHeight * 2) / 3 + margin;
    setHeight(cardHeight);
    setWidth(cardWidth);
    setBuffer(Math.floor(containerHeight / cardHeight));
    setPerChunk(
      Math.floor((window.innerWidth - window.innerWidth * 0.25) / cardWidth)
    );
  }, [showHead, containerHeight]);

  useEffect(() => {
    calcImagesValues();

    window.addEventListener('resize', calcImagesValues);

    return () => window.removeEventListener('resize', calcImagesValues);
  }, [containerRef, width, calcImagesValues]);

  const setRef = useCallback(
    (node: HTMLDivElement) => {
      containerRef.current = node;
      calcImagesValues();
    },
    [calcImagesValues]
  );

  const onSelectImage = (hash: string | null) => {
    if (selectedModelType === 'checkpoints' && hash !== null) {
      navigate(`/image-detail/${hash}`);
    }
  };

  const toggleHead = () => {
    setShowHead(!showHead);
    calcImagesValues();
  };

  if (selectedModelName && modelInfo) {
    const modelImages = modelImagesList.map((imgSrc, i) => {
      return (
        <div key={`md_${imgSrc}_i`}>
          <figure
            key={`model_detail_model_image_${i}`}
            className="card__figure rounded-md overflow-hidden"
            style={{
              width: '220px',
              height: '330px',
            }}
          >
            <Image
              src={imgSrc}
              alt={`model_detail_model_image_${i}`}
              height="100%"
              width="100%"
              className="object-cover"
            />
          </figure>
        </div>
      );
    });

    const chunks =
      userImagesList.length > 0
        ? userImagesList.reduce((resultArr: RowData[], item, index) => {
            const chunkIndex = Math.floor(index / perChunk);

            if (!resultArr[chunkIndex]) {
              resultArr[chunkIndex] = {
                row: [],
                id: '',
              };
            }

            resultArr[chunkIndex].row.push({
              path: `${item.path}\\${item.name}.thumbnail.png`,
              hash: item.hash,
              rating: item.rating,
              id: item.hash,
            });
            resultArr[chunkIndex].id = item.hash;
            return resultArr;
          }, [])
        : modelImagesList.reduce((resultArr: RowData[], item, index) => {
            const chunkIndex = Math.floor(index / perChunk);

            if (!resultArr[chunkIndex]) {
              resultArr[chunkIndex] = {
                row: [],
                id: '',
              };
            }

            resultArr[chunkIndex].row.push({
              path: item,
              rating: 1,
              hash: null,
              id: item,
            });
            resultArr[chunkIndex].id = `${item}_${index}`;
            return resultArr;
          }, []);

    const rowRenderer = (row: VirtualScrollData) => {
      const items = row.row.map((item: Row, j: number) => {
        return (
          <div
            id={`${item.hash}`}
            key={`${item.hash || `${item.path}_row_${j}`}`}
            className="cursor-pointer"
            onClick={() => onSelectImage(item.hash)}
            aria-hidden="true"
          >
            <figure
              className="card__figure rounded-md overflow-hidden relative"
              style={{
                width: `${width}px`,
                height: `${height}px`,
                marginRight: `${margin}px`,
              }}
            >
              <div className="absolute top-2 right-2 z-20">
                <Rating value={item.rating} />
              </div>
              <Image
                src={item.path}
                alt={`model_detail_model_image_${j}`}
                height="100%"
                width="100%"
                className="object-cover"
              />
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

    const responsive = {
      superLargeDesktop: {
        // the naming can be any, depends on you.
        breakpoint: { max: 4000, min: 3000 },
        items: 4,
      },
      desktop: {
        breakpoint: { max: 3000, min: 1024 },
        items: 4,
      },
      tablet: {
        breakpoint: { max: 1024, min: 464 },
        items: 4,
      },
      mobile: {
        breakpoint: { max: 464, min: 0 },
        items: 4,
      },
    };

    return (
      <main className="p-4 flex justify-center relative">
        <div className="absolute top-10 right-10">
          <button
            className="btn btn-circle"
            type="button"
            onClick={() => toggleHead()}
          >
            {showHead ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 6.75L12 3m0 0l3.75 3.75M12 3v18"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
                />
              </svg>
            )}
          </button>
        </div>
        <section className="w-5/6">
          <div
            className={classNames('courtain', {
              'courtain-hidden': !showHead,
            })}
            style={{
              height: showHead ? '427px' : '0px',
            }}
          >
            <div>
              <p className="text-2xl font-bold text-gray-300">
                {selectedModelName}
              </p>
              <div className="flex w-full my-4">
                <div className="w-4/6">
                  <Carousel responsive={responsive}>{modelImages}</Carousel>
                </div>
                <div className="w-2/6 pl-4">
                  <div className="overflow-x-auto">
                    <ModelTableDetail modelInfo={modelInfo} />
                  </div>
                </div>
              </div>
            </div>
            <hr className="mt-12 border-base-200" />
          </div>
          {chunks.length > 0 ? (
            <div className="mt-8">
              <h3 className="text-xl font-bold text-center">Images</h3>
              <div
                ref={setRef}
                className="mt-12 w-full"
                style={{ height: `${containerHeight}px` }}
              >
                <VirtualScroll
                  data={chunks}
                  rowRenderer={rowRenderer}
                  settings={{
                    buffer,
                    rowHeight: height,
                    rowMargin: margin,
                    tolerance: 2,
                  }}
                />
              </div>
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  return null;
}
