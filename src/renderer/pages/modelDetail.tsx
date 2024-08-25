import classNames from 'classnames';
import { IpcRendererEvent } from 'electron';
import ReactHtmlParser from 'html-react-parser';
import { ImageRow } from 'main/ipc/image';
import { useNavigate, useParams } from 'react-router-dom';
import { ModelCivitaiInfo, ModelInfoImage } from 'main/interfaces';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import Rating from 'renderer/components/Rating';
import {
  checkpointsAtom,
  lorasAtom,
  updateModel,
} from 'renderer/state/models.store';
import { settingsAtom } from 'renderer/state/settings.store';
import { imagesAtom } from 'renderer/state/images.store';
import { useAtom } from 'jotai';
import { Model } from 'main/ipc/model';
import { OsContext } from 'renderer/hocs/detect-os';
import { convertPath, getFileDir } from 'renderer/utils';
import Carousel from 'react-multi-carousel';
import ModelTableDetail from 'renderer/components/ModelTableDetail';
import VirtualScroll from 'renderer/components/VirtualScroll';
import Image from '../components/Image';

export default function ModelDetail() {
  const navigate = useNavigate();
  const navigatorParams = useParams();
  const selectedModelHash = navigatorParams.hash;

  const os = useContext(OsContext);

  const [lorasState] = useAtom(lorasAtom);
  const [checkpointsState] = useAtom(checkpointsAtom);
  const [settingsState] = useAtom(settingsAtom);
  const [imagesState, setImagesState] = useAtom(imagesAtom);

  let modelData: Model | null = null;
  if (selectedModelHash) {
    if (lorasState.models[selectedModelHash]) {
      modelData = lorasState.models[selectedModelHash];
    }
    if (checkpointsState.models[selectedModelHash]) {
      modelData = checkpointsState.models[selectedModelHash];
    }
  }

  const [showHead, setShowHead] = useState<boolean>(true);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const [modelCivitaiInfo, setModelCivitaiInfo] =
    useState<ModelCivitaiInfo | null>(null);
  const [userImagesList, setUserImagesList] = useState<ImageRow[]>([]);
  const [modelImagesList, setModelImagesList] = useState<
    [string, ModelInfoImage | null][]
  >([]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const [carouselCards, setCarouselCards] = useState<number>(1);

  const [width, setWidth] = useState(320);
  const [height, setHeight] = useState(480);
  const [perChunk, setPerChunk] = useState(4);
  const [buffer, setBuffer] = useState(3);
  const margin = 20;

  const maxWindowWith = 4000;
  const minWindowWith = 700;
  const maxZoom = 6;
  const minZoom = 1;

  const [deleteActive, setDeleteActive] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      if (modelData) {
        const modelsPath = getFileDir(modelData.path, os);
        console.log(modelData, modelsPath);

        if (modelsPath) {
          const modelCiviInfo = await window.ipcHandler.readFile(
            convertPath(
              `${modelsPath}\\${modelData.fileName}.civitai.info`,
              os,
            ),
            'utf-8',
          );
          if (modelCiviInfo) {
            setModelCivitaiInfo(JSON.parse(modelCiviInfo));
          }

          const userImagesListsResponse: ImageRow[] =
            await window.ipcHandler.getImages(modelData.fileName);
          setUserImagesList(userImagesListsResponse);

          const modelImagesListResponse: [string, ModelInfoImage | null][] =
            await window.ipcHandler.readdirModelImages(
              modelData.fileName,
              modelsPath,
            );
          setModelImagesList(modelImagesListResponse);
        }
      }
    };
    load();
  }, [settingsState, modelData, os]);

  useEffect(() => {
    const cb = (event: IpcRendererEvent, imagesData: ImageRow) => {
      if (modelData?.name === imagesData.model) {
        setUserImagesList([imagesData, ...userImagesList]);
      }
    };
    const remove = window.ipcOn.detectedAddImage(cb);

    return () => remove();
  }, [userImagesList, modelData]);

  const calcImagesValues = useCallback(() => {
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    let zoomLevel = 1;

    if (windowWidth < minWindowWith) {
      zoomLevel = minZoom;
    } else if (windowWidth > maxWindowWith) {
      zoomLevel = maxZoom;
    } else {
      zoomLevel = Math.round((windowWidth / maxWindowWith) * maxZoom);
    }

    let headHeight = showHead ? 380 : 0;

    if (windowWidth < 1024) {
      headHeight = 0;
    }

    // carousel cards
    setCarouselCards((windowWidth * 0.6) / 230);

    setContainerHeight(windowHeight - headHeight - 300);
    setContainerWidth(windowWidth * 0.9);

    const cardWidth = (containerWidth - zoomLevel * 16) / zoomLevel; // (cardHeight * 2) / 3;
    const cardHeight = (cardWidth * 3) / 2; // containerHeight / zoomLevel - rowMargin;
    setHeight(cardHeight);
    setWidth(cardWidth);
    setBuffer(Math.floor(containerHeight / cardHeight));
    setPerChunk(zoomLevel);
  }, [containerHeight, containerWidth, showHead]);

  useEffect(() => {
    calcImagesValues();

    window.addEventListener('resize', calcImagesValues);

    return () => window.removeEventListener('resize', calcImagesValues);
  }, [containerRef, width, calcImagesValues]);

  useEffect(() => {
    return () => {
      setImagesState((draft) => {
        draft.toDelete = {};
      });
    };
  }, [setImagesState]);

  const setRef = useCallback(
    (node: HTMLDivElement) => {
      containerRef.current = node;
      calcImagesValues();
    },
    [calcImagesValues],
  );

  const goToModelImageDetail = (index: number) => {
    navigate(`image-detail/${index}`);
  };

  const onSelectImage = (item: ImageRow) => {
    if (modelData?.type === 'checkpoint') {
      if (item.hash !== null) {
        if (deleteActive) {
          if (imagesState.toDelete[item.hash]) {
            setImagesState((draft) => {
              const imgs = { ...imagesState.toDelete };
              delete imgs[item.hash];
              draft.toDelete = imgs;
            });
          } else {
            setImagesState((draft) => {
              draft.toDelete = {
                ...draft.toDelete,
                [item.hash]: item,
              };
            });
          }
        } else {
          navigate(`/image-detail/${item.hash}`);
        }
      }
    } else {
      console.log(item.path);
      const index = modelImagesList.findIndex((i) => i[0] === item.path);
      if (index) {
        goToModelImageDetail(index);
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
      setImagesState((draft) => {
        draft.toDelete = {};
      });
    }
  };

  const onRatingChange = async (rating: number) => {
    if (modelData) {
      await updateModel(modelData.hash, modelData.type, 'rating', rating);
    }
  };

  const revealInFolder = () => {
    if (modelData) {
      window.ipcHandler.openFolderLink(modelData.path);
    }
  };

  if (modelData && modelCivitaiInfo) {
    // carousel
    const modelImages = modelImagesList.map(
      (imgItem: [string, ModelInfoImage | null], i) => {
        return (
          <div
            key={`md_${imgItem[0]}_i`}
            onClick={() => goToModelImageDetail(i)}
            aria-hidden="true"
            className="cursor-pointer"
          >
            <figure
              key={`model_detail_model_image_${i}`}
              className="card__figure animated rounded-md overflow-hidden"
              style={{
                width: '220px',
                height: '330px',
              }}
            >
              <Image
                src={imgItem[0]}
                alt={`model_detail_model_image_${i}`}
                height="100%"
                width="100%"
                className="object-cover"
                onDragPath={imgItem[0]}
              />
            </figure>
          </div>
        );
      },
    );

    const rowRenderer =
      userImagesList.length > 0
        ? (visibleData: ImageRow[]) => {
            const items = visibleData.map((item: ImageRow, i: number) => {
              return (
                <div
                  id={`${item.hash}`}
                  key={`${item.hash || `${item.path}_row_${i}`}`}
                  className={classNames([
                    'cursor-pointer overflow-hidden rounded-md py-2 w-fit',
                    {
                      'opacity-50':
                        item.hash !== null
                          ? imagesState.toDelete[item.hash]
                          : false,
                    },
                  ])}
                  onClick={() => onSelectImage(item)}
                  aria-hidden="true"
                >
                  <figure
                    className="card__figure animated rounded-md relative"
                    style={{
                      width: `${width}px`,
                      height: `${height}px`,
                    }}
                  >
                    <div className="absolute top-2 right-2 z-20">
                      <Rating
                        id={`model-detail-rating-${item.hash}`}
                        value={item.rating}
                      />
                    </div>
                    <Image
                      src={item.sourcePath}
                      alt={`model_detail_model_image_${i}`}
                      height="100%"
                      width="100%"
                      className="object-cover"
                      onDragPath={item.sourcePath}
                    />
                  </figure>
                </div>
              );
            });

            return (
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${perChunk}, minmax(0, 1fr))`,
                }}
              >
                {items}
              </div>
            );
          }
        : (visibleData: string[]) => {
            const items = visibleData.map((modelImage: string, i: number) => {
              return (
                <div
                  id={`${modelImage}_${i}`}
                  key={`${modelImage}_${i}`}
                  aria-hidden="true"
                  className="cursor-pointer overflow-hidden rounded-md py-2 w-fit"
                >
                  <figure
                    className="card__figure animated rounded-md relative"
                    style={{
                      width: `${width}px`,
                      height: `${height}px`,
                    }}
                  >
                    <Image
                      src={modelImage}
                      alt={`model_detail_model_image_${i}`}
                      height="100%"
                      width="100%"
                      className="object-cover"
                      onDragPath={modelImage}
                    />
                  </figure>
                </div>
              );
            });

            return (
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${perChunk}, minmax(0, 1fr))`,
                }}
              >
                {items}
              </div>
            );
          };

    const descriptionElement = (data: Model) => {
      if (data.modelDescription) {
        return (
          <div className="pt-2">
            <div>{ReactHtmlParser(data.modelDescription || '')}</div>
            <div className="divider" />
            <div>{ReactHtmlParser(data.description || '')}</div>
          </div>
        );
      }
      return <div>{ReactHtmlParser(data.description || '')}</div>;
    };

    return (
      <main className="pb-10 pt-10 flex justify-center relative">
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
          <div className="flex flex-row items-center">
            <button
              type="button"
              className="text-2xl font-bold text-gray-300"
              onClick={() => revealInFolder()}
            >
              {modelData.name}
            </button>
            <div className="ml-4 flex">
              <Rating
                id={`model-detail-rating-2-${modelData.hash}`}
                value={modelData.rating}
                onClick={(e, value) => onRatingChange(value)}
              />
            </div>
          </div>
          <div
            className={classNames('courtain hidden lg:block', {
              hidden: !showHead,
            })}
            style={{
              height: showHead ? '380px' : '0px',
            }}
          >
            <div className="flex w-full mt-4">
              <div className="w-4/6">
                <Carousel
                  responsive={{
                    default: {
                      breakpoint: {
                        max: Number.POSITIVE_INFINITY,
                        min: Number.NEGATIVE_INFINITY,
                      },
                      items: carouselCards,
                    },
                  }}
                >
                  {modelImages}
                </Carousel>
              </div>
              <div
                className="w-2/6 pl-4 overflow-y-auto"
                style={{ height: '330px' }}
              >
                <div className="">
                  <ModelTableDetail modelInfo={modelCivitaiInfo} />
                </div>
              </div>
            </div>
          </div>
          {descriptionElement(modelData)}

          <div className="pt-4">
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
              {userImagesList.length > 0 ? (
                <VirtualScroll
                  id="model_detail_user_images_virtualscroll"
                  data={userImagesList}
                  render={rowRenderer}
                  settings={{
                    containerHeight,
                    buffer,
                    rowHeight: height,
                    rowMargin: margin,
                    tolerance: 1,
                    cols: perChunk,
                  }}
                />
              ) : (
                <VirtualScroll
                  id="model_detail_model_images_virtualscroll"
                  data={modelImagesList.map((f) => f[0])}
                  render={rowRenderer}
                  settings={{
                    containerHeight,
                    buffer,
                    rowHeight: height,
                    rowMargin: margin,
                    tolerance: 1,
                    cols: perChunk,
                  }}
                />
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return null;
}
