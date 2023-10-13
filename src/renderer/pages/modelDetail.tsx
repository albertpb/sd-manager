import classNames from 'classnames';
import { IpcRendererEvent } from 'electron';
import { ImageRow } from 'main/ipc/organizeImages';
import { useNavigate, useParams } from 'react-router-dom';
import { ModelCivitaiInfo } from 'main/interfaces';
import { Model } from 'main/ipc/model';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ModelTableDetail from 'renderer/components/ModelTableDetail';
import { AppDispatch, RootState } from 'renderer/redux';
import Carousel from 'react-multi-carousel';
import VirtualScroll, {
  VirtualScrollData,
} from 'renderer/components/VirtualScroll';
import Rating from 'renderer/components/Rating';
import { setImagesToDelete, updateModel } from 'renderer/redux/reducers/global';
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
  const dispatch = useDispatch<AppDispatch>();
  const navigatorParams = useParams();
  const selectedModelHash = navigatorParams.hash;

  const settings = useSelector((state: RootState) => state.global.settings);
  const imagesToDelete = useSelector(
    (state: RootState) => state.global.imagesToDelete
  );
  const modelData: Model | null = useSelector((state: RootState) => {
    if (selectedModelHash) {
      if (state.global.checkpoints.models[selectedModelHash]) {
        return state.global.checkpoints.models[selectedModelHash];
      }
      if (state.global.loras.models[selectedModelHash]) {
        return state.global.loras.models[selectedModelHash];
      }
    }
    return null;
  });

  const [showHead, setShowHead] = useState<boolean>(true);
  const [containerHeight, setContainerHeight] = useState<number>(0);

  const [modelCivitaiInfo, setModelCivitaiInfo] =
    useState<ModelCivitaiInfo | null>(null);
  const [userImagesList, setUserImagesList] = useState<ImageRow[]>([]);
  const [modelImagesList, setModelImagesList] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const [width, setWidth] = useState(320);
  const [height, setHeight] = useState(480);
  const [perChunk, setPerChunk] = useState(4);
  const [buffer, setBuffer] = useState(3);
  const margin = 20;

  const [deleteActive, setDeleteActive] = useState<boolean>(false);

  useEffect(() => {
    if (modelData) {
      const load = async () => {
        const mapPathsModels: Record<string, string | null> = {
          checkpoint: settings.checkpointsPath,
          lora: settings.lorasPath,
        };

        const modelsPath = mapPathsModels[modelData.type];

        if (modelsPath) {
          const modelCiviInfo = await window.ipcHandler.readFile(
            `${modelsPath}\\${modelData.name}.civitai.info`,
            'utf-8'
          );
          if (modelCiviInfo) {
            setModelCivitaiInfo(JSON.parse(modelCiviInfo));
          }

          const userImagesListsResponse: ImageRow[] =
            await window.ipcHandler.getImages(modelData.name);
          setUserImagesList(userImagesListsResponse);

          const modelImagesListResponse =
            await window.ipcHandler.readdirModelImages(
              modelData.name,
              modelsPath
            );
          setModelImagesList(modelImagesListResponse);
        }
      };
      load();
    }
  }, [settings, modelData]);

  useEffect(() => {
    const cb = (event: IpcRendererEvent, imagesData: ImageRow) => {
      if (modelData?.name === imagesData.model) {
        setUserImagesList([imagesData, ...userImagesList]);
      }
    };
    window.ipcOn.detectedAddImage(cb);

    return () => window.ipcOn.rmDetectedAddImage(cb);
  }, [modelData, userImagesList]);

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
      Math.floor((window.innerWidth - window.innerWidth * 0.15) / cardWidth)
    );
  }, [showHead, containerHeight]);

  useEffect(() => {
    calcImagesValues();

    window.addEventListener('resize', calcImagesValues);

    return () => window.removeEventListener('resize', calcImagesValues);
  }, [containerRef, width, calcImagesValues]);

  useEffect(() => {
    return () => {
      dispatch(setImagesToDelete({}));
    };
  }, [dispatch]);

  const setRef = useCallback(
    (node: HTMLDivElement) => {
      containerRef.current = node;
      calcImagesValues();
    },
    [calcImagesValues]
  );

  const onSelectImage = (hash: string | null) => {
    if (modelData?.type === 'checkpoint') {
      if (hash !== null) {
        if (deleteActive) {
          if (imagesToDelete[hash]) {
            const imgs = { ...imagesToDelete };
            delete imgs[hash];
            dispatch(setImagesToDelete(imgs));
          } else {
            dispatch(setImagesToDelete({ ...imagesToDelete, [hash]: true }));
          }
        } else {
          navigate(`/image-detail/${hash}`);
        }
      }
    }
  };

  const toggleHead = () => {
    setShowHead(!showHead);
    calcImagesValues();
  };

  const toggleImagesDeleteState = () => {
    setDeleteActive(!deleteActive);
    if (deleteActive) {
      dispatch(setImagesToDelete({}));
    }
  };

  const onRatingChange = async (rating: number) => {
    if (modelData) {
      await window.ipcHandler.updateModel(modelData.hash, 'rating', rating);

      await dispatch(
        updateModel({
          hash: modelData.hash,
          field: 'rating',
          value: rating,
        })
      );
    }
  };

  if (modelData && modelCivitaiInfo) {
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
            className={classNames([
              'cursor-pointer',
              {
                'opacity-50':
                  item.hash !== null ? imagesToDelete[item.hash] : false,
              },
            ])}
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
        items: 7,
      },
      desktop: {
        breakpoint: { max: 3000, min: 1024 },
        items: 5,
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
      <main className="px-4 pb-4 pt-10 flex justify-center relative h-full">
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
        <section className="w-11/12">
          <div
            className={classNames('courtain', {
              'courtain-hidden': !showHead,
            })}
            style={{
              height: showHead ? '427px' : '0px',
            }}
          >
            <div>
              <div className="flex flex-row items-center">
                <p className="text-2xl font-bold text-gray-300">
                  {modelData.name}
                </p>
                <div className="ml-4 flex">
                  <Rating
                    value={modelData.rating}
                    onClick={(value) => onRatingChange(value)}
                  />
                </div>
              </div>
              <div className="flex w-full my-4">
                <div className="w-4/6">
                  <Carousel responsive={responsive}>{modelImages}</Carousel>
                </div>
                <div className="w-2/6 pl-4">
                  <div className="overflow-x-auto">
                    <ModelTableDetail modelInfo={modelCivitaiInfo} />
                  </div>
                </div>
              </div>
            </div>
            <hr className="mt-12 border-base-200" />
          </div>
          {chunks.length > 0 ? (
            <div className="mt-8">
              <div className="flex items-center">
                <div className="w-1/3"> </div>
                <h3 className="text-xl font-bold text-center w-1/3">Images</h3>
                <div className="w-1/3 flex items-center justify-end pr-10">
                  {userImagesList.length > 0 ? (
                    <ul className="menu menu-horizontal bg-base-200 rounded-box">
                      <li>
                        <button
                          type="button"
                          onClick={() => toggleImagesDeleteState()}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            className={classNames([
                              'w-5 h-5',
                              { 'stroke-red-500': deleteActive },
                            ])}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                            />
                          </svg>
                        </button>
                      </li>
                    </ul>
                  ) : null}
                </div>
              </div>
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
