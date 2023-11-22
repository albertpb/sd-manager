import Fuse from 'fuse.js';
import ModelCard from 'renderer/components/ModelCard';
import { useNavigate } from 'react-router-dom';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import VirtualScroll from 'renderer/components/VirtualScroll';
import classNames from 'classnames';
import { IpcRendererEvent } from 'electron';
import { toast } from 'react-toastify';
import StatusBar from 'renderer/components/StatusBar';
import Tagger from 'renderer/components/Tagger';
import { Tag } from 'main/ipc/tag';
import { SelectValue } from 'react-tailwindcss-select/dist/components/type';
import {
  ModelWithTags,
  checkpointsAtom,
  createModelTag,
  lorasAtom,
  modelTagsAtom,
  modelsAtom,
  modelsWithTags,
  removeAllModelsTags,
  setActiveMTags,
  setModelsCheckingUpdate,
  setModelsToUpdate,
  tagModel,
  updateModel,
} from 'renderer/state/models.store';
import ContextMenu from 'renderer/components/ContextMenu';
import { useAtom } from 'jotai';
import { settingsAtom } from 'renderer/state/settings.store';
import { navbarAtom } from 'renderer/state/navbar.store';
import { imagesAtom } from 'renderer/state/images.store';

export default function Models({ type }: { type: 'checkpoint' | 'lora' }) {
  const navigate = useNavigate();

  const CONTEXT_MENU_ID = `${type}_models_context_menu`;
  const VIRTUAL_SCROLL_ID = `${type}_models_virtualscroll`;
  const VIRTUAL_SCROLL_CONTAINER_ID = `${type}_models_container`;

  const [isContextMenuOpen, setIsContextMenuOpen] = useState<boolean>(false);

  const [models, setModels] = useState<ModelWithTags[]>([]);

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
  const [filterByMTags, setFilterByMTags] = useState<Set<string>>(new Set());

  const [selectedModels, setSelectedModels] = useState<boolean[]>([]);

  const [settingsState] = useAtom(settingsAtom);
  const [modelsWTags] = useAtom(modelsWithTags[type]);
  const [navbarState, setNavbarState] = useAtom(navbarAtom);
  const [modelsState, setModelsState] = useAtom(modelsAtom[type]);
  const [lorasState] = useAtom(lorasAtom);
  const [checkpointsState] = useAtom(checkpointsAtom);
  const [imagesState] = useAtom(imagesAtom);
  const [mtags] = useAtom(modelTagsAtom);

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
    async (e: React.MouseEvent<HTMLDivElement>, hash: string) => {
      const model = Object.values(modelsState.models).find(
        (m) => m.hash === hash,
      );
      if (e.ctrlKey) {
        if (model) {
          window.ipcHandler.openLink(
            `https://civitai.com/models/${model.modelId}`,
          );
        }
      } else if (e.shiftKey) {
        if (model) {
          const activeMTagsArr =
            settingsState.activeMTags !== ''
              ? settingsState.activeMTags?.split(',') || []
              : [];
          for (let i = 0; i < activeMTagsArr.length; i++) {
            await tagModel(activeMTagsArr[i], model.hash, type);
          }
        }
      } else if (!modelsState.checkingUpdates) {
        if (model?.modelId) {
          navigate(`/model-detail/${hash}`);
        } else {
          toast('Model has no data');
        }
      }
    },
    [
      modelsState.checkingUpdates,
      navigate,
      modelsState.models,
      settingsState.activeMTags,
      type,
    ],
  );

  const fuse = new Fuse(modelsWTags, {
    keys: ['name'],
  });

  const modelsResult =
    navbarState.searchInput === ''
      ? modelsWTags
      : fuse.search(navbarState.searchInput).map((result) => result.item);

  const filterByTagFunc = useCallback(
    (model: ModelWithTags) => {
      const modeltags = Object.values(model.tags);
      if (modeltags.length > 0) {
        return modeltags.every((t) => {
          return (
            filterByMTags.size === modeltags.length && filterByMTags.has(t.id)
          );
        });
      }
      return false;
    },
    [filterByMTags],
  );

  const sortFilterModels = useCallback(
    (filter = 'none', sort = 'none') => {
      if (modelsState.checkingUpdates) {
        return;
      }

      let filterSortedModels = [...modelsResult];

      filterSortedModels =
        filterByMTags.size > 0
          ? filterSortedModels.filter(filterByTagFunc)
          : filterSortedModels;

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
    [
      modelsResult,
      modelsState.update,
      modelsState.checkingUpdates,
      filterByTagFunc,
      filterByMTags.size,
    ],
  );

  const onFilterByMTag = (mtag: Tag) => {
    if (filterByMTags.has(mtag.id)) {
      filterByMTags.delete(mtag.id);
    } else {
      filterByMTags.add(mtag.id);
    }
    setFilterByMTags(new Set([...filterByMTags]));
    sortFilterModels(filterBy, sortBy);
  };

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
    event: React.MouseEvent<HTMLInputElement>,
    hash: string,
    value: number,
  ) => {
    event.stopPropagation();

    await updateModel(hash, type, 'rating', value);
  };

  const onSetActiveMTags = async (
    e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
    selectedTags: SelectValue,
  ) => {
    await setActiveMTags(selectedTags);
  };

  const addMTag = async (label: string, bgColor: string) => {
    if (label !== '') {
      await createModelTag(label, bgColor);
    }
  };

  const onContextMenuTag = async (
    e: React.MouseEvent<HTMLElement>,
    tagId: string,
  ) => {
    e.stopPropagation();
    const modelsHashes = selectedModels.reduce(
      (acc: string[], isSelected, i) => {
        if (isSelected) {
          acc.push(models[i].hash);
        }
        return acc;
      },
      [],
    );

    for (let i = 0; i < modelsHashes.length; i++) {
      await tagModel(tagId, modelsHashes[i], type);
    }
  };

  const removeTagsFromSelected = async () => {
    for (let i = 0; i < selectedModels.length; i++) {
      if (selectedModels[i]) {
        await removeAllModelsTags(models[i].hash, type);
      }
    }
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
    setNavbarState((draft) => {
      draft.disabled = true;
    });
    setModelsState((draft) => {
      draft.checkingUpdates = true;
    });
    await window.ipcHandler.checkModelsToUpdate(type);
    setModelsState((draft) => {
      draft.checkingUpdates = false;
    });
    setNavbarState((draft) => {
      draft.disabled = false;
    });
  };

  const checkingModelUpdateCb = useCallback(
    (event: IpcRendererEvent, loading: boolean, modelId: number) => {
      if (models.findIndex((model) => model.modelId === modelId) === -1) {
        const updatingModels = modelsWTags.filter(
          (model) => model.modelId === modelId,
        );
        setModels([...updatingModels, ...models]);
      }

      setModelsCheckingUpdate(type, modelId, loading);
    },
    [type, models, modelsWTags],
  );

  useEffect(() => {
    const remove = window.ipcOn.checkingModelUpdate(checkingModelUpdateCb);

    return () => remove();
  }, [checkingModelUpdateCb]);

  useEffect(() => {
    const remove = window.ipcOn.modelToUpdate(
      (event: IpcRendererEvent, modelId: number) => {
        setModelsToUpdate(type, modelId);
      },
    );

    return () => remove();
  }, [type]);

  const rowRenderer = (
    visibleData: ModelWithTags[],
    selectedItems: boolean[],
  ) => {
    const items = visibleData.map((item, i) => {
      const imagePath =
        type === 'checkpoint'
          ? `${settingsState.checkpointsPath}\\${item.name}\\${item.name}_0.png`
          : `${settingsState.lorasPath}\\${item.name}\\${item.name}_0.png`;

      const loading =
        item.modelId && modelsState.update[item.modelId]
          ? modelsState.update[item.modelId].loading
          : false;
      const needUpdate =
        item.modelId && modelsState.update[item.modelId]
          ? modelsState.update[item.modelId].needUpdate
          : false;

      return (
        <ModelCard
          id={`model-card-models-${item.hash}`}
          key={`${item.hash}_${item.name}`}
          onClick={(e) => onModelCardClick(e, item.hash)}
          loading={loading}
          needUpdate={needUpdate}
          name={item.name}
          rating={item.rating}
          imagePath={imagePath}
          width={`${width}px`}
          height={`${height}px`}
          type={type}
          imageClassName="object-cover"
          className={classNames([
            {
              'max-w-fit': zoomLevel === 1,
              'opacity-50': selectedItems[i],
            },
          ])}
          showRating={showRating}
          hoverEffect={hoverEffect}
          showBadge={showBadge}
          showName={showModelName}
          onRatingChange={(e, value) => onRatingChange(e, item.hash, value)}
          tags={item.tags}
        />
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
          <Tagger
            filterByTags={filterByMTags}
            tags={mtags}
            activeTags={settingsState.activeMTags}
            onAddTag={addMTag}
            onFilterByTag={onFilterByMTag}
            onSetActiveTags={onSetActiveMTags}
          />
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
      <div id={VIRTUAL_SCROLL_CONTAINER_ID} className="flex flex-col w-full">
        <ContextMenu
          id={CONTEXT_MENU_ID}
          containerId={VIRTUAL_SCROLL_CONTAINER_ID}
          isOpen={isContextMenuOpen}
          onClose={() => setIsContextMenuOpen(false)}
          onOpen={() => selectedModels.length > 0 && setIsContextMenuOpen(true)}
        >
          <li>
            <button type="button">Tags</button>
            <ul>
              <li className="max-h-56 overflow-y-auto">
                {Object.values(mtags).map((tag) => (
                  <button
                    type="button"
                    className=""
                    key={`images_context_tags_${tag.id}`}
                    onClick={(e) => onContextMenuTag(e, tag.id)}
                  >
                    {tag.label}
                  </button>
                ))}
              </li>
            </ul>
          </li>
          <li>
            <button type="button" onClick={() => removeTagsFromSelected()}>
              Remove all tags
            </button>
          </li>
        </ContextMenu>
        <div className="py-0 pl-5 pr-0">
          <VirtualScroll
            id={VIRTUAL_SCROLL_ID}
            saveState
            data={models}
            settings={{
              buffer,
              rowHeight: height,
              tolerance: 1,
              rowMargin,
              containerHeight,
              cols: perChunk,
              selectable: {
                enabled: true,
                itemHeight: height,
                itemWidth: width,
                total: models.length,
              },
            }}
            render={rowRenderer}
            onSelectItems={(m) => setSelectedModels(m)}
          />
        </div>
        <StatusBar
          totalCards={Object.values(modelsState.models).length}
          filteredCards={models.length}
          checkpointsImportProgress={checkpointsState.importProgress}
          lorasImportProgress={lorasState.importProgress}
          imagesImportProgress={imagesState.importProgress}
        />
      </div>
    </div>
  );
}
