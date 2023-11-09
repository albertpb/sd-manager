import Fuse from 'fuse.js';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from 'renderer/redux';
import ModelCard from 'renderer/components/ModelCard';
import { useNavigate } from 'react-router-dom';
import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import VirtualScroll, {
  VirtualScrollData,
} from 'renderer/components/VirtualScroll';
import { Model } from 'main/ipc/model';
import classNames from 'classnames';
import {
  ModelState,
  setCheckingModelsUpdate,
  setModelsCheckingUpdate,
  setModelsToUpdate,
  setNavbarDisabled,
  updateModel,
} from 'renderer/redux/reducers/global';
import { IpcRendererEvent } from 'electron';
import { toast } from 'react-toastify';
import StatusBar from 'renderer/components/StatusBar';

interface RowData {
  row: Fuse.FuseResult<Model>[];
  id: string;
}

export default function Models({
  modelsState,
  type,
}: {
  modelsState: ModelState;
  type: 'checkpoint' | 'lora';
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const settings = useSelector((state: RootState) => state.global.settings);
  const navbarSearchInput = useSelector(
    (state: RootState) => state.global.navbarSearchInput,
  );

  const [models, setModels] = useState<Model[]>(
    Object.values(modelsState.models).sort((a, b) => b.rating - a.rating),
  );

  const [filterBy, setFilterBy] = useState<string>(
    localStorage.getItem(`models-${type}-filterBy`) || 'none',
  );
  const [sortBy, setSortBy] = useState<string>(
    localStorage.getItem(`models-${type}-sortBy`) || 'ratingDesc',
  );

  const localStorageZoomLevel = localStorage.getItem(
    `models-${type}-zoomLevel`,
  );
  const [zoomLevel, setZoomLevel] = useState<number>(
    parseInt(localStorageZoomLevel === null ? '3' : localStorageZoomLevel, 10),
  );
  const [showRating, setShowRating] = useState<boolean>(
    localStorage.getItem(`models-${type}-showRating`) === 'true',
  );
  const [showModelName, setShowModelName] = useState<boolean>(
    localStorage.getItem(`models-${type}-showModelName`) === null
      ? true
      : localStorage.getItem(`models-${type}-showModelName`) === 'true',
  );
  const [hoverEffect, setHoverEffect] = useState<boolean>(
    localStorage.getItem(`models-${type}-hoverEffect`) === null
      ? true
      : localStorage.getItem(`models-${type}-hoverEffect`) === 'true',
  );
  const [showBadge, setShowBadge] = useState<boolean>(
    localStorage.getItem(`models-${type}-showBadge`) === null
      ? true
      : localStorage.getItem(`models-${type}-showBadge`) === 'true',
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [width, setWidth] = useState(320);
  const [height, setHeight] = useState(480);
  const [perChunk, setPerChunk] = useState(4);
  const [buffer, setBuffer] = useState(3);
  const maxZoom = 8;
  const rowMargin = 10;

  const onModelCardClick = useCallback(
    (e: MouseEvent<HTMLDivElement>, hash: string) => {
      const model = Object.values(modelsState.models).find(
        (m) => m.hash === hash,
      );
      if (e.ctrlKey) {
        if (model) {
          window.ipcHandler.openLink(
            `https://civitai.com/models/${model.modelId}`,
          );
          return;
        }
      }
      if (!modelsState.checkingUpdates) {
        if (model?.modelId) {
          navigate(`/model-detail/${hash}`);
        } else {
          toast('Model has no data');
        }
      }
    },
    [modelsState.checkingUpdates, navigate, modelsState.models],
  );

  const fuse = new Fuse(models, {
    keys: ['name'],
  });

  const resultCards =
    navbarSearchInput === ''
      ? models.map((model, i) => {
          return {
            item: model,
            matches: [],
            score: 1,
            refIndex: i,
          };
        })
      : fuse.search(navbarSearchInput);

  const sortFilterModels = useCallback(
    (filter = 'none', sort = 'none') => {
      if (modelsState.checkingUpdates) {
        return;
      }

      let filterSortedModels = Object.values(modelsState.models);

      switch (filter) {
        case 'Other': {
          filterSortedModels = filterSortedModels.filter(
            (model) => model.baseModel === 'Other' || model.baseModel === null,
          );
          break;
        }

        case 'SD 1.5': {
          filterSortedModels = filterSortedModels.filter(
            (model) => model.baseModel === 'SD 1.5',
          );
          break;
        }

        case 'SDXL 1.0': {
          filterSortedModels = filterSortedModels.filter(
            (model) => model.baseModel === 'SDXL 1.0',
          );
          break;
        }

        case 'update': {
          filterSortedModels = filterSortedModels.filter((model) => {
            if (model.modelId && modelsState.update[model.modelId]) {
              return modelsState.update[model.modelId].needUpdate;
            }
            return false;
          });
          break;
        }

        default: {
          break;
        }
      }

      switch (sort) {
        case 'ratingAsc': {
          filterSortedModels = filterSortedModels.sort(
            (a, b) => a.rating - b.rating,
          );
          break;
        }

        case 'ratingDesc': {
          filterSortedModels = filterSortedModels.sort(
            (a, b) => b.rating - a.rating,
          );
          break;
        }

        case 'modelIdAsc': {
          filterSortedModels = filterSortedModels.sort(
            (a, b) => (a.modelId || 0) - (b.modelId || 0),
          );
          break;
        }

        case 'modelIdDesc': {
          filterSortedModels = filterSortedModels.sort(
            (a, b) => (b.modelId || 0) - (a.modelId || 0),
          );
          break;
        }

        default: {
          break;
        }
      }

      setSortBy(sort);
      setFilterBy(filter);
      setModels(filterSortedModels);
    },
    [modelsState.models, modelsState.update, modelsState.checkingUpdates],
  );

  const calcImagesValues = useCallback(() => {
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    setContainerHeight(windowHeight - 125);
    setContainerWidth(windowWidth - 120);

    const cardWidth = (containerWidth - zoomLevel * 16) / zoomLevel; // (cardHeight * 2) / 3;
    const cardHeight = (cardWidth * 3) / 2; // containerHeight / zoomLevel - rowMargin;

    setHeight(cardHeight);
    setWidth(cardWidth);
    setBuffer(Math.floor(containerHeight / cardHeight));

    setPerChunk(zoomLevel);
  }, [containerHeight, containerWidth, zoomLevel]);

  const setRef = useCallback(
    (node: HTMLDivElement) => {
      containerRef.current = node;
      calcImagesValues();
    },
    [calcImagesValues],
  );

  const onResize = useCallback(() => {
    calcImagesValues();
  }, [calcImagesValues]);

  const onRatingChange = async (
    event: MouseEvent<HTMLInputElement>,
    hash: string,
    value: number,
  ) => {
    event.stopPropagation();

    await dispatch(
      updateModel({
        hash,
        field: 'rating',
        value,
      }),
    );
  };

  useEffect(() => {
    return () => {
      localStorage.setItem(`models-${type}-filterBy`, filterBy);
      localStorage.setItem(`models-${type}-sortBy`, sortBy);
      localStorage.setItem(`models-${type}-zoomLevel`, `${zoomLevel}`);
      localStorage.setItem(`models-${type}-showRating`, `${showRating}`);
      localStorage.setItem(`models-${type}-showModelName`, `${showModelName}`);
      localStorage.setItem(`models-${type}-hoverEffect`, `${hoverEffect}`);
      localStorage.setItem(`models-${type}-showBadge`, `${showBadge}`);
    };
  }, [
    type,
    filterBy,
    sortBy,
    zoomLevel,
    showRating,
    showModelName,
    hoverEffect,
    showBadge,
  ]);

  useEffect(() => {
    sortFilterModels(filterBy, sortBy);
  }, [sortFilterModels, filterBy, sortBy]);

  useEffect(() => {
    calcImagesValues();
    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, [containerRef, width, calcImagesValues, onResize]);

  const checkUpdates = async () => {
    setModels([]);
    sortFilterModels('update', 'modelIdAsc');
    dispatch(setNavbarDisabled(true));
    dispatch(setCheckingModelsUpdate({ type, updating: true }));
    await window.ipcHandler.checkModelsToUpdate(type);
    dispatch(setNavbarDisabled(false));
    dispatch(setCheckingModelsUpdate({ type, updating: false }));
  };

  const checkingModelUpdateCb = useCallback(
    (event: IpcRendererEvent, loading: boolean, modelId: number) => {
      if (models.findIndex((model) => model.modelId === modelId) === -1) {
        const updatingModels = Object.values(modelsState.models).filter(
          (model) => model.modelId === modelId,
        );
        setModels([...updatingModels, ...models]);
      }

      dispatch(setModelsCheckingUpdate({ type, modelId, loading }));
    },
    [dispatch, modelsState.models, type, models],
  );

  useEffect(() => {
    const remove = window.ipcOn.checkingModelUpdate(checkingModelUpdateCb);

    return () => remove();
  }, [checkingModelUpdateCb]);

  useEffect(() => {
    const remove = window.ipcOn.modelToUpdate(
      (event: IpcRendererEvent, modelId: number) => {
        dispatch(setModelsToUpdate({ type, modelId }));
      },
    );

    return () => remove();
  }, [dispatch, type]);

  const chunks = resultCards.reduce((resultArr: RowData[], item, index) => {
    const chunkIndex = Math.floor(index / perChunk);

    if (!resultArr[chunkIndex]) {
      resultArr[chunkIndex] = {
        row: [],
        id: '',
      };
    }
    resultArr[chunkIndex].row.push(item);
    resultArr[chunkIndex].id += `${item.item.hash}_${index}`;

    return resultArr;
  }, []);

  const rowRenderer = (row: VirtualScrollData) => {
    const items = row.row.map(({ item }: Fuse.FuseResult<Model>) => {
      const imagePath =
        type === 'checkpoint'
          ? `${settings.checkpointsPath}\\${item.name}\\${item.name}_0.png`
          : `${settings.lorasPath}\\${item.name}\\${item.name}_0.png`;

      const loading =
        item.modelId && modelsState.update[item.modelId]
          ? modelsState.update[item.modelId].loading
          : false;
      const needUpdate =
        item.modelId && modelsState.update[item.modelId]
          ? modelsState.update[item.modelId].needUpdate
          : false;

      return (
        <div
          onClick={(e) => onModelCardClick(e, item.hash)}
          key={`${item.hash}_${item.name}`}
          aria-hidden="true"
        >
          <ModelCard
            id={`model-card-models-${item.hash}`}
            loading={loading}
            needUpdate={needUpdate}
            name={item.name}
            rating={item.rating}
            imagePath={imagePath}
            width={`${width}px`}
            height={`${height}px`}
            type={type}
            imageClassName="object-cover"
            className={{
              'max-w-fit': zoomLevel === 1,
            }}
            showRating={showRating}
            onDragPath={imagePath}
            hoverEffect={hoverEffect}
            showBadge={showBadge}
            showName={showModelName}
            onRatingChange={(e, value) => onRatingChange(e, item.hash, value)}
          />
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
    <div ref={setRef} className="w-full h-full flex">
      <div className="w-fit h-full">
        <ul className="menu bg-base-200 border-t border-base-300 h-full pt-10">
          <li
            className="dropdown dropdown-right tooltip tooltip-right"
            data-tip={`zoom level: ${zoomLevel}`}
          >
            <button type="button">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z"
                />
              </svg>
              <ul className="dropdown-content cursor-default z-[999] menu p-2 shadow-xl bg-base-200 rounded-box w-fit">
                <div className="w-64 p-2 flex flex-col relative">
                  <input
                    type="range"
                    min={1}
                    max={maxZoom}
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(parseInt(e.target.value, 10))}
                    className="range range-primary range-xs"
                  />
                </div>
              </ul>
            </button>
          </li>
          <li
            className="tooltip tooltip-right"
            data-tip={`show badge: ${showBadge ? 'on' : 'off'}`}
          >
            <button type="button" onClick={() => setShowBadge(!showBadge)}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={classNames('w-5 h-5', {
                  'fill-green-500': showBadge,
                  'stroke-green-500': !showBadge,
                })}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 6h.008v.008H6V6z"
                />
              </svg>
            </button>
          </li>
          <li
            className="tooltip tooltip-right"
            data-tip={`show rating: ${showRating ? 'on' : 'off'}`}
          >
            <button type="button" onClick={() => setShowRating(!showRating)}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className={classNames([
                  'w-5 h-5',
                  { 'fill-green-500': showRating },
                ])}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
            </button>
          </li>
          <li
            className="tooltip tooltip-right"
            data-tip={`hover effect: ${hoverEffect ? 'on' : 'off'}`}
          >
            <button type="button" onClick={() => setHoverEffect(!hoverEffect)}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={classNames([
                  'w-5 h-5',
                  { 'stroke-green-500': hoverEffect },
                ])}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 10-4.773-4.773 3.375 3.375 0 004.774 4.774zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </li>
          <li
            className="tooltip tooltip-right"
            data-tip={`show model name: ${showModelName ? 'on' : 'off'}`}
          >
            <button
              type="button"
              onClick={() => setShowModelName(!showModelName)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={classNames([
                  'w-5 h-5',
                  { 'stroke-green-500': showRating },
                ])}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 9h16.5m-16.5 6.75h16.5"
                />
              </svg>
            </button>
          </li>
          <li className="tooltip tooltip-right" data-tip="All">
            <button
              disabled={modelsState.checkingUpdates}
              type="button"
              onClick={() => sortFilterModels()}
            >
              <span
                className={classNames([
                  'w-5 h-5',
                  {
                    'text-green-500': filterBy === 'none',
                  },
                ])}
              >
                All
              </span>
            </button>
          </li>
          <li className="tooltip tooltip-right" data-tip="SD 1.5">
            <button
              disabled={modelsState.checkingUpdates}
              type="button"
              onClick={() => sortFilterModels('SD 1.5', sortBy)}
            >
              <span
                className={classNames([
                  'w-5 h-5',
                  {
                    'text-green-500': filterBy === 'SD 1.5',
                  },
                ])}
              >
                1.5
              </span>
            </button>
          </li>
          <li className="tooltip tooltip-right" data-tip="SD XL">
            <button
              disabled={modelsState.checkingUpdates}
              type="button"
              onClick={() => sortFilterModels('SDXL 1.0', sortBy)}
            >
              <span
                className={classNames([
                  'w-5 h-5',
                  {
                    'text-green-500': filterBy === 'SDXL 1.0',
                  },
                ])}
              >
                XL
              </span>
            </button>
          </li>
          <li className="tooltip tooltip-right" data-tip="SD Other">
            <button
              disabled={modelsState.checkingUpdates}
              type="button"
              onClick={() => sortFilterModels('Other', sortBy)}
            >
              <span
                className={classNames([
                  'w-5 h-5',
                  {
                    'text-green-500': filterBy === 'Other',
                  },
                ])}
              >
                Oth
              </span>
            </button>
          </li>
          <li className="tooltip tooltip-right" data-tip="sort by rating asc">
            <button
              disabled={modelsState.checkingUpdates}
              type="button"
              onClick={() => sortFilterModels(filterBy, 'ratingAsc')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={classNames([
                  'w-5 h-5',
                  { 'stroke-green-500': sortBy === 'ratingAsc' },
                ])}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
                />
              </svg>
            </button>
          </li>
          <li className="tooltip tooltip-right" data-tip="sort by rating desc">
            <button
              disabled={modelsState.checkingUpdates}
              type="button"
              onClick={() => sortFilterModels(filterBy, 'ratingDesc')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={classNames([
                  'w-5 h-5',
                  { 'stroke-green-500': sortBy === 'ratingDesc' },
                ])}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
                />
              </svg>
            </button>
          </li>
          <li className="tooltip tooltip-right" data-tip="Check Updates">
            <button
              disabled={modelsState.checkingUpdates}
              type="button"
              onClick={() => checkUpdates()}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
                />
              </svg>
            </button>
          </li>
          <li className="tooltip tooltip-right" data-tip="filter update">
            <button
              disabled={modelsState.checkingUpdates}
              type="button"
              onClick={() => sortFilterModels('update', 'modelIdAsc')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={classNames([
                  'w-5 h-5',
                  { 'stroke-green-500': filterBy === 'update' },
                ])}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3"
                />
              </svg>
            </button>
          </li>
        </ul>
      </div>
      <div className="flex flex-col w-full">
        <div className="flex flex-col w-full">
          <div className="py-0 pl-5 pr-0">
            <VirtualScroll
              id={`${type}_virtualscroll`}
              saveState
              data={chunks}
              settings={{
                buffer,
                rowHeight: height,
                tolerance: 3,
                rowMargin,
                containerHeight,
              }}
              rowRenderer={rowRenderer}
            />
          </div>
        </div>
        <StatusBar
          totalCards={Object.values(modelsState.models).length}
          filteredCards={resultCards.length}
        />
      </div>
    </div>
  );
}
