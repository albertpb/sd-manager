import { createSelector } from '@reduxjs/toolkit';
import classNames from 'classnames';
import Fuse from 'fuse.js';
import { ImageRow } from 'main/ipc/image';
import { Tag } from 'main/ipc/tag';
import {
  KeyboardEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { SelectValue } from 'react-tailwindcss-select/dist/components/type';
import Image from 'renderer/components/Image';
import Rating from 'renderer/components/Rating';
import StatusBar from 'renderer/components/StatusBar';
import Tagger from 'renderer/components/Tagger';
import VirtualScroll from 'renderer/components/VirtualScroll';
import { AppDispatch, RootState } from 'renderer/redux';
import {
  createTag,
  readImages,
  scanImages,
  setActiveTags,
  setAutoImportTags,
  setImagesToDelete,
  tagImage,
  updateImage,
} from 'renderer/redux/reducers/global';

export default function Images() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const virtualScrollId = 'images_virtualscroll';

  const localStorageZoomLevel = localStorage.getItem('images-zoomLevel');
  const [zoomLevel, setZoomLevel] = useState<number>(
    parseInt(localStorageZoomLevel === null ? '3' : localStorageZoomLevel, 10),
  );
  const [showRating, setShowRating] = useState<boolean>(
    localStorage.getItem('images-showRating') === null
      ? true
      : localStorage.getItem('images-showRating') === 'true',
  );
  const [showModelName, setShowModelName] = useState<boolean>(
    localStorage.getItem('images-showModelName') === null
      ? true
      : localStorage.getItem('images-showModelName') === 'true',
  );
  const [hoverEffect, setHoverEffect] = useState<boolean>(
    localStorage.getItem('images-hoverEffect') === null
      ? true
      : localStorage.getItem('images-hoverEffect') === 'true',
  );
  const [deleteActive, setDeleteActive] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>(
    localStorage.getItem('images-sortBy') || 'ratingDesc',
  );
  const localStorageFilterByRating = localStorage.getItem(
    'images-filterByRating',
  );
  const [filterByRating, setFilterByRating] = useState<number>(
    parseInt(
      localStorageFilterByRating === null ? '0' : localStorageFilterByRating,
      10,
    ),
  );
  const [filterByTags, setFilterByTags] = useState<Set<string>>(new Set());
  const [showTag, setShowTag] = useState<boolean>(
    localStorage.getItem('images-showTag') === null
      ? true
      : localStorage.getItem('images-showTag') === 'true',
  );

  const images = useSelector((state: RootState) => state.global.images);
  const watchFolders = useSelector(
    (state: RootState) => state.global.watchFolders,
  );
  const navbarSearchInput = useSelector(
    (state: RootState) => state.global.navbarSearchInput,
  );
  const imagesToDelete = useSelector(
    (state: RootState) => state.global.imagesToDelete,
  );
  const filterCheckpoint = useSelector(
    (state: RootState) => state.global.filterCheckpoint,
  );
  const tags = useSelector((state: RootState) => state.global.tags);
  const tagsMap = createSelector(
    (state: Tag[]) => state,
    (t) =>
      t.reduce((acc: Record<string, Tag>, tag) => {
        acc[tag.id] = tag;
        return acc;
      }, {}),
  )(tags);
  const activeTags = useSelector(
    (state: RootState) => state.global.settings.activeTags,
  );
  const autoTagImportImages = useSelector(
    (state: RootState) => state.global.settings.autoTagImportImages,
  );
  const autoImportTags = useSelector(
    (state: RootState) => state.global.settings.autoImportTags,
  );

  const [imagesList, setImagesList] = useState<ImageRow[]>([...images]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const [width, setWidth] = useState(320);
  const [height, setHeight] = useState(480);
  const [perChunk, setPerChunk] = useState(4);
  const [buffer, setBuffer] = useState(3);
  const maxZoom = 8;
  const rowMargin = 10;

  const filterByRatingFunc = useCallback(
    (img: ImageRow) => img.rating === filterByRating,
    [filterByRating],
  );

  const filterByModelFunc = useCallback(
    (img: ImageRow) => img.model === filterCheckpoint,
    [filterCheckpoint],
  );

  const filterByTagFunc = useCallback(
    (img: ImageRow) => {
      const imgtags = Object.values(img.tags);
      if (imgtags.length > 0) {
        return imgtags.every((t) => {
          return filterByTags.size === imgtags.length && filterByTags.has(t);
        });
      }
      return false;
    },
    [filterByTags],
  );

  const sortFilterImages = useCallback(
    (sortByArg: string) => {
      setSortBy(sortByArg);

      let filteredImages =
        filterCheckpoint === ''
          ? [...images]
          : [...images].filter(filterByModelFunc);

      filteredImages =
        filterByRating > 0
          ? filteredImages.filter(filterByRatingFunc)
          : filteredImages;

      filteredImages =
        filterByTags.size > 0
          ? filteredImages.filter(filterByTagFunc)
          : filteredImages;

      switch (sortByArg) {
        case 'rowNumAsc': {
          const sortedImages = filteredImages.sort(
            (a, b) => (a.rowNum || 0) - (b.rowNum || 0),
          );
          setImagesList(sortedImages);
          break;
        }

        case 'rowNumDesc': {
          const sortedImages = filteredImages.sort(
            (a, b) => (b.rowNum || 0) - (a.rowNum || 0),
          );
          setImagesList(sortedImages);
          break;
        }

        case 'nameAsc': {
          const sortedImages = filteredImages.sort((a, b) => {
            if (a.name > b.name) return 1;
            if (a.name < b.name) return -1;
            return 0;
          });
          setImagesList(sortedImages);
          break;
        }

        case 'nameDesc': {
          const sortedImages = filteredImages.sort((a, b) => {
            if (b.name > a.name) return 1;
            if (b.name < a.name) return -1;
            return 0;
          });
          setImagesList(sortedImages);
          break;
        }

        case 'ratingAsc': {
          const sortedImages = filteredImages.sort(
            (a, b) => a.rating - b.rating,
          );
          setImagesList(sortedImages);
          break;
        }

        case 'ratingDesc':
        default: {
          const sortedImages = filteredImages.sort(
            (a, b) => b.rating - a.rating,
          );
          setImagesList(sortedImages);
          break;
        }
      }
    },
    [
      filterByModelFunc,
      images,
      filterCheckpoint,
      filterByRating,
      filterByRatingFunc,
      filterByTagFunc,
      filterByTags,
    ],
  );

  const filterImagesByRating = (rating: number) => {
    if (rating === filterByRating) {
      setFilterByRating(0);
    } else {
      setFilterByRating(rating);
    }
    sortFilterImages(sortBy);
  };

  const onFilterByTag = (tag: Tag) => {
    if (filterByTags.has(tag.id)) {
      filterByTags.delete(tag.id);
    } else {
      filterByTags.add(tag.id);
    }
    setFilterByTags(new Set([...filterByTags]));
    sortFilterImages(sortBy);
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

  useEffect(() => {
    return () => {
      localStorage.setItem('images-zoomLevel', `${zoomLevel}`);
      localStorage.setItem('images-showRating', `${showRating}`);
      localStorage.setItem('images-showModelName', `${showModelName}`);
      localStorage.setItem('images-hoverEffect', `${hoverEffect}`);
      localStorage.setItem('images-sortBy', sortBy);
      localStorage.setItem('images-filterByRating', `${filterByRating}`);
      localStorage.setItem('images-showTag', `${showTag}`);
    };
  }, [
    zoomLevel,
    showRating,
    showModelName,
    hoverEffect,
    sortBy,
    filterByRating,
    showTag,
  ]);

  useEffect(() => {
    sortFilterImages(sortBy);
  }, [images, sortFilterImages, sortBy]);

  useEffect(() => {
    calcImagesValues();
    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, [containerRef, width, calcImagesValues, onResize]);

  const fuse = new Fuse(imagesList, {
    keys: ['model'],
  });

  const imagesResult =
    navbarSearchInput === ''
      ? imagesList
      : fuse.search(navbarSearchInput).map((result) => result.item);

  const onImageClick = async (
    e: MouseEvent<HTMLDivElement>,
    image: ImageRow,
  ) => {
    if (deleteActive) {
      if (imagesToDelete[image.hash]) {
        const imgs = { ...imagesToDelete };
        delete imgs[image.hash];
        dispatch(setImagesToDelete(imgs));
      } else {
        dispatch(setImagesToDelete({ ...imagesToDelete, [image.hash]: image }));
      }
    } else if (e.shiftKey) {
      const activeTagsArr =
        activeTags !== '' ? activeTags?.split(',') || [] : [];
      for (let i = 0; i < activeTagsArr.length; i++) {
        await dispatch(
          tagImage({ tagId: activeTagsArr[i], imageHash: image.hash }),
        );
      }
    } else {
      navigate(`/image-detail/${image.hash}`);
    }
  };

  const toggleImagesDeleteState = () => {
    setDeleteActive(!deleteActive);
    if (deleteActive) {
      dispatch(setImagesToDelete({}));
    }
  };

  const updateImagesDb = async () => {
    await dispatch(scanImages(watchFolders.map((f) => f.path)));
    await dispatch(readImages());
  };

  const onSetActiveTags = async (
    e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
    selectedTags: SelectValue,
  ) => {
    await dispatch(setActiveTags(selectedTags));
  };

  const onSetAutoImportTags = async (
    e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
    selectedTags: SelectValue,
  ) => {
    await dispatch(setAutoImportTags(selectedTags));
  };

  const addTag = async (label: string, bgColor: string) => {
    if (label !== '') {
      await dispatch(createTag({ label, bgColor }));
    }
  };

  const onRatingChange = async (
    event: MouseEvent<HTMLInputElement>,
    hash: string,
    value: number,
  ) => {
    event.stopPropagation();
    if (hash) {
      await dispatch(updateImage({ hash, field: 'rating', value }));
    }
  };

  useEffect(() => {
    return () => {
      dispatch(setImagesToDelete({}));
    };
  }, [dispatch]);

  const rowRenderer = (visibleData: ImageRow[], selectedItems: boolean[]) => {
    const rows = visibleData.map((item, i) => {
      const imageSrc =
        zoomLevel <= 2
          ? `${item.path}\\${item.name}.png`
          : `${item.path}\\thumbnails\\${item.name}.thumbnail.webp`;

      return (
        <div
          id={`${item.hash}`}
          key={`${item.hash}`}
          className={classNames([
            'cursor-pointer overflow-hidden rounded-md py-2 w-fit',
            {
              'opacity-50': imagesToDelete[item.hash],
            },
          ])}
          onClick={(e) => onImageClick(e, item)}
          aria-hidden="true"
        >
          <figure
            className={classNames([
              'card__figure rounded-md overflow-hidden relative',
              {
                animated: hoverEffect,
                'max-w-fit': zoomLevel === 1,
                'opacity-50': selectedItems[i],
              },
            ])}
            style={{
              width: `${width}px`,
              height: `${height}px`,
            }}
          >
            {showTag && (
              <div className="absolute top-2 left-2 z-20">
                {Object.keys(item.tags).map((tag: string) => (
                  <div
                    key={`image-tag-${item.hash}-${tag}`}
                    className="badge border-none mt-2 block"
                    style={{
                      background: tagsMap[tag]?.bgColor,
                      color: tagsMap[tag]?.color,
                    }}
                  >
                    {tagsMap[tag]?.label}
                  </div>
                ))}
              </div>
            )}
            {showRating && (
              <div className="absolute top-2 right-2 z-20">
                <Rating
                  id={item.hash}
                  value={item.rating}
                  onClick={(e, value) => onRatingChange(e, item.hash, value)}
                />
              </div>
            )}
            <Image
              src={imageSrc}
              onDragPath={item.sourcePath}
              alt={`model_detail_model_image_${item.hash}`}
              height="100%"
              width="100%"
              className="object-cover"
            />
            {showModelName && (
              <div className="absolute bottom-0 left-0 w-full p-3 flex flex-col">
                <p className="text font-bold text-white truncate">
                  {item.model}
                </p>
              </div>
            )}
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
        {rows}
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
            <button type="button" aria-label="zoom-level">
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
            onSetActiveTags={onSetActiveTags}
            activeTags={activeTags}
            tags={tags}
            tagsMap={tagsMap}
            filterByTags={filterByTags}
            onAddTag={addTag}
            onFilterByTag={onFilterByTag}
            autoImportTags={autoImportTags}
            autoTagImportImages={autoTagImportImages}
            onSetAutoImportTags={onSetAutoImportTags}
          />
          <li
            className="tooltip tooltip-right"
            data-tip={showTag ? `show tags` : 'hide tags'}
          >
            <button
              type="button"
              aria-label="show-tag"
              onClick={() => setShowTag(!showTag)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={classNames('w-5 h-5', {
                  'fill-green-500': showTag,
                  'stroke-green-500': !showTag,
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
            data-tip={`hover effect: ${hoverEffect ? 'on' : 'off'}`}
          >
            <button
              type="button"
              aria-label="hover-effect"
              onClick={() => setHoverEffect(!hoverEffect)}
            >
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
              aria-label="show-model-name"
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
                  { 'stroke-green-500': showModelName },
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
          <li
            className="tooltip tooltip-right"
            data-tip={`show rating: ${showRating ? 'on' : 'off'}`}
          >
            <button
              type="button"
              aria-label="show-rating"
              onClick={() => setShowRating(!showRating)}
            >
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
          <li className="dropdown dropdown-right">
            <button aria-label="filter-by-rating" type="button">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className={classNames([
                  'w-5 h-5',
                  { 'stroke-green-500': filterByRating > 0 },
                ])}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
              <ul className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-fit">
                <Rating
                  id="images-rating-selector"
                  value={filterByRating}
                  onClick={(e, rating) => filterImagesByRating(rating)}
                  hidden={filterByRating === 0}
                />
              </ul>
            </button>
          </li>
          <li className="tooltip tooltip-right" data-tip="sort by rating asc">
            <button
              type="button"
              aria-label="sort-rating-asc"
              onClick={() => sortFilterImages('ratingAsc')}
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
              type="button"
              aria-label="sort-rating-desc"
              onClick={() => sortFilterImages('ratingDesc')}
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
          <li className="tooltip tooltip-right" data-tip="sort by asc">
            <button
              type="button"
              aria-label="sort-asc"
              onClick={() => sortFilterImages('rowNumAsc')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={classNames([
                  'w-5 h-5',
                  { 'stroke-green-500': sortBy === 'rowNumAsc' },
                ])}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l7.5-7.5 7.5 7.5m-15 6l7.5-7.5 7.5 7.5"
                />
              </svg>
            </button>
          </li>
          <li className="tooltip tooltip-right" data-tip="sort by desc">
            <button
              type="button"
              aria-label="sort-desc"
              onClick={() => sortFilterImages('rowNumDesc')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={classNames([
                  'w-5 h-5',
                  { 'stroke-green-500': sortBy === 'rowNumDesc' },
                ])}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 5.25l-7.5 7.5-7.5-7.5m15 6l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>
          </li>
          <li className="tooltip tooltip-right" data-tip="sort by name asc">
            <button
              type="button"
              aria-label="sort-name-asc"
              onClick={() => sortFilterImages('nameAsc')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={classNames([
                  'w-5 h-5',
                  { 'stroke-green-500': sortBy === 'nameAsc' },
                ])}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12"
                />
              </svg>
            </button>
          </li>
          <li className="tooltip tooltip-right" data-tip="sort by name desc">
            <button
              type="button"
              aria-label="sort-name-desc"
              onClick={() => sortFilterImages('nameDesc')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={classNames([
                  'w-5 h-5',
                  { 'stroke-green-500': sortBy === 'nameDesc' },
                ])}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25"
                />
              </svg>
            </button>
          </li>
          <li
            className="tooltip tooltip-right"
            data-tip="update images database"
          >
            <button
              type="button"
              aria-label="update-images-db"
              onClick={() => updateImagesDb()}
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
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
            </button>
          </li>
          <li className="tooltip tooltip-right" data-tip="delete images">
            <button
              type="button"
              aria-label="delete-images"
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
      </div>
      <div className="flex flex-col w-full">
        <div className="py-0 pl-5 pr-0">
          <VirtualScroll
            id={virtualScrollId}
            saveState
            data={imagesResult}
            settings={{
              buffer,
              rowHeight: height,
              tolerance: 1,
              rowMargin,
              containerHeight,
              cols: perChunk,
              selectable: {
                enabled: false,
                itemHeight: height,
                itemWidth: width,
                total: imagesResult.length,
              },
            }}
            render={rowRenderer}
          />
        </div>
        <StatusBar
          totalCards={images.length}
          filteredCards={imagesResult.length}
        />
      </div>
    </div>
  );
}
