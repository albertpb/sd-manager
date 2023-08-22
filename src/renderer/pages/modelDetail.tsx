import classNames from 'classnames';
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
import Image from '../components/Image';

interface RowData {
  row: string[];
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
  const [userImagesList, setUserImagesList] = useState<Set<string>>(new Set());
  const [modelImagesList, setModelImagesList] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const [width, setWidth] = useState(320);
  const [height, setHeight] = useState(480);
  const [perChunk, setPerChunk] = useState(4);
  const [buffer, setBuffer] = useState(3);
  const margin = 20;
  const rowsToShow = 1;

  useEffect(() => {
    if (selectedModelName) {
      const load = async () => {
        if (selectedModelType === 'checkpoint') {
          const modelData = await window.ipcHandler.readFile(
            `${settings.checkpointsPath}\\${selectedModelName}.civitai.info`,
            'utf-8'
          );
          if (modelData) {
            setModelInfo(JSON.parse(modelData));
          }

          const userImagesListsResponse = await window.ipcHandler.readdirImages(
            selectedModelName
          );
          setUserImagesList(new Set(userImagesListsResponse));

          const modelImagesListResponse =
            await window.ipcHandler.readdirModelImages(selectedModelName);
          setModelImagesList(modelImagesListResponse);
        }
      };
      load();
    }
  }, [settings, selectedModelName, selectedModelType]);

  useEffect(() => {
    window.ipcOn.detectedAddImage(
      (event, modelName: string, detectedFile: string) => {
        console.log(modelName, detectedFile);
        if (selectedModelName === modelName) {
          setUserImagesList(new Set([detectedFile, ...userImagesList]));
        }
      }
    );
  }, [selectedModelName, userImagesList]);

  const calcImagesValues = useCallback(() => {
    const windowHeight = window.innerHeight;

    if (showHead) {
      setContainerHeight(windowHeight - 750);
    } else {
      setContainerHeight(windowHeight - 350);
    }

    const cardHeight = (containerHeight / rowsToShow || 480) - margin;
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

  const onSelectImage = (imgSrc: string) => {
    const baseName = imgSrc.split(/[\\/]/).pop();
    navigate(`/image-detail/${selectedModelName}/${baseName}`);
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

    const chunks = Array.from(userImagesList).reduce(
      (resultArr: RowData[], item, index) => {
        const chunkIndex = Math.floor(index / perChunk);

        if (!resultArr[chunkIndex]) {
          resultArr[chunkIndex] = {
            row: [],
            id: '',
          };
        }

        resultArr[chunkIndex].row.push(item);
        resultArr[chunkIndex].id = `${item}_${index}`;
        return resultArr;
      },
      []
    );

    const rowRenderer = (row: VirtualScrollData) => {
      const items = row.row.map((imgSrc: string, j: number) => {
        return (
          <div
            id={`${imgSrc}`}
            key={`${imgSrc}`}
            className="cursor-pointer"
            onClick={() => onSelectImage(imgSrc)}
            aria-hidden="true"
          >
            <figure
              className="card__figure rounded-md overflow-hidden"
              style={{
                width: `${width}px`,
                height: `${height}px`,
                marginRight: `${margin}px`,
              }}
            >
              <Image
                src={imgSrc}
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
                {modelInfo.model.name}
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
          <div className="mt-8">
            <h3 className="text-xl font-bold text-center">Generated Images</h3>
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
        </section>
      </main>
    );
  }

  return null;
}
