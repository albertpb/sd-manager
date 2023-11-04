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
import ColorPicker from 'renderer/components/ColorPicker';
import Image from 'renderer/components/Image';
import Rating from 'renderer/components/Rating';
import VirtualScroll, {
  VirtualScrollData,
} from 'renderer/components/VirtualScroll';
import { AppDispatch, RootState } from 'renderer/redux';
import {
  createTag,
  readImages,
  scanImages,
  setActiveTag,
  setImagesToDelete,
  tagImage,
} from 'renderer/redux/reducers/global';

interface RowData {
  row: Fuse.FuseResult<ImageRow>[];
  id: string;
}

export default function Images() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const virtualScrollId = 'images_virtualscroll';

  const [zoomLevel, setZoomLevel] = useState<number>(3);
  const [showRating, setShowRating] = useState<boolean>(true);
  const [showModelName, setShowModelName] = useState<boolean>(true);
  const [imageAnimated, setImageAnimated] = useState<boolean>(true);
  const [deleteActive, setDeleteActive] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('ratingDesc');
  const [filterByRating, setFilterByRating] = useState<number>(0);
  const [filterByTags, setFilterByTags] = useState<Set<string>>(new Set());
  const [addTagLabel, setAddTagLabel] = useState<string>('');
  const [addTagBgColor, setAddTagBgColor] = useState<string>('#269310');
  const [showTag, setShowTag] = useState<boolean>(true);

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
  const activeTag = useSelector(
    (state: RootState) => state.global.settings.activeTag,
  );

  const [imagesList, setImagesList] = useState<ImageRow[]>([...images]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);

  const [width, setWidth] = useState(320);
  const [height, setHeight] = useState(480);
  const [perChunk, setPerChunk] = useState(4);
  const [buffer, setBuffer] = useState(3);
  const maxRows = 3;
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
    (img: ImageRow) => [...filterByTags].some((t) => img.tags[t]),
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
    setContainerHeight(windowHeight - 150);

    const cardHeight = containerHeight / zoomLevel - rowMargin;
    const cardWidth = (cardHeight * 2) / 3;

    setHeight(cardHeight);
    setWidth(cardWidth);
    setBuffer(Math.floor(containerHeight / cardHeight));

    setPerChunk(
      Math.floor((windowWidth - windowHeight * 0.15) / cardWidth) || 1,
    );
  }, [containerHeight, zoomLevel]);

  const setRef = useCallback(
    (node: HTMLDivElement) => {
      containerRef.current = node;
      calcImagesValues();
    },
    [calcImagesValues],
  );

  const onResize = useCallback(() => {
    const windowHeight = window.innerHeight;

    if (windowHeight > 1300) {
      setZoomLevel(3);
    } else if (windowHeight <= 1299 && windowHeight >= 900) {
      setZoomLevel(2);
    } else if (windowHeight <= 899) {
      setZoomLevel(1);
    }

    calcImagesValues();
  }, [calcImagesValues]);

  useEffect(() => {
    onResize();
    // eslint-disable-next-line
  }, []);

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
      ? imagesList.map((image, i) => {
          return {
            item: image,
            matches: [],
            score: 1,
            refIndex: i,
          };
        })
      : fuse.search(navbarSearchInput);

  const chunks = imagesResult.reduce((resultArr: RowData[], item, index) => {
    const chunkIndex = Math.floor(index / perChunk);

    if (!resultArr[chunkIndex]) {
      resultArr[chunkIndex] = {
        id: '',
        row: [],
      };
    }

    resultArr[chunkIndex].row.push(item);
    resultArr[chunkIndex].id = item.item.hash;
    return resultArr;
  }, []);

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
    } else if (e.shiftKey && activeTag) {
      await dispatch(tagImage({ tagId: activeTag, imageHash: image.hash }));
    } else {
      navigate(`/image-detail/${image.hash}`);
    }
  };

  const changeZoom = () => {
    let newZoomLevel = zoomLevel;
    if (zoomLevel >= maxRows) {
      newZoomLevel = 1;
    } else {
      newZoomLevel += 1;
    }
    setZoomLevel(newZoomLevel);

    const windowHeight = window.innerHeight;
    if (windowHeight < 1300 && newZoomLevel >= 3) {
      setShowRating(false);
    } else if (windowHeight < 900 && newZoomLevel === 2) {
      setShowRating(false);
    } else {
      setShowRating(true);
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

  const onSetActiveTag = async (tag: string) => {
    await dispatch(setActiveTag(tag));
  };

  const addTag = async () => {
    if (addTagLabel !== '') {
      await dispatch(createTag({ label: addTagLabel, bgColor: addTagBgColor }));
      setAddTagLabel('');
    }
  };

  const onAddTagKeyPress = async (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      // const target = e.target as HTMLInputElement;
      // target.blur();
      await addTag();
    }
  };

  useEffect(() => {
    return () => {
      dispatch(setImagesToDelete({}));
    };
  }, [dispatch]);

  const rowRenderer = (row: VirtualScrollData) => {
    const items = row.row.map(({ item }: Fuse.FuseResult<ImageRow>) => {
      const imageSrc =
        zoomLevel <= 2
          ? `${item.path}\\${item.name}.png`
          : `${item.path}\\${item.name}.thumbnail.webp`;

      return (
        <div
          id={`${item.hash}`}
          key={`${item.hash}`}
          className={classNames([
            'cursor-pointer relative overflow-hidden rounded-md p-0 m-2',
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
                animated: imageAnimated,
              },
              {
                'max-w-fit': zoomLevel === 1,
              },
            ])}
            style={{
              width: `${width}px`,
              height: `${height}px`,
            }}
          >
            {showTag && (
              <div className="absolute top-2 left-2 z-20 sm:hidden md:hidden lg:block">
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
              <div className="absolute top-2 right-2 z-20 sm:hidden md:hidden lg:block">
                <Rating id={item.hash} value={item.rating} />
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
      <div key={row.id} className="flex flex-nowrap w-full">
        {items}
      </div>
    );
  };

  return (
    <div ref={setRef} className="W-full h-full flex">
      <div className="w-fit h-full">
        <ul className="menu bg-base-200 border-t border-base-300 h-full pt-10">
          <li
            className="tooltip tooltip-right"
            data-tip={`zoom level ${zoomLevel}`}
          >
            <button type="button" onClick={() => changeZoom()}>
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
            </button>
          </li>
          <li className="dropdown dropdown-right">
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
                  d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 6h.008v.008H6V6z"
                />
              </svg>
              <ul className="dropdown-content cursor-default z-[999] menu p-2 shadow-xl bg-base-200 rounded-box w-fit">
                <div className="w-64 p-2 flex flex-col relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5 absolute top-2 right-2 cursor-pointer hover:text-primary"
                    onClick={() => navigate('/settings')}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>

                  <div className="flex flex-col">
                    <div className="form-control w-full max-w-xs">
                      <label className="label">
                        <span className="label-text">Current active tag</span>
                      </label>
                      <select
                        className="select select-bordered select-sm w-full max-w-xs"
                        value={activeTag || ''}
                        onChange={(e) => onSetActiveTag(e.target.value)}
                      >
                        <option value="">None</option>
                        {tags.map((tag) => {
                          return (
                            <option key={`active-tag-${tag.id}`} value={tag.id}>
                              {tag.label}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="mt-4">
                      <kbd className="kbd kbd-sm">Shift</kbd> +{' '}
                      <kbd className="kbd kbd-sm">Click</kbd>
                      <span className="ml-2">To tag image</span>
                    </div>
                  </div>
                  <div className="divider m-0 mt-2 p-0" />
                  <div className="mt-2">
                    <p className="">Click to filter: </p>
                    <div className="flex flex-wrap flex-row">
                      {tags.map((tag) => {
                        return (
                          <div
                            key={tag.id}
                            className={classNames(
                              'badge gap-2 cursor-pointer mr-2 mt-2',
                              {
                                'opacity-100': filterByTags.has(tag.id),
                                'opacity-50': !filterByTags.has(tag.id),
                              },
                            )}
                            style={{
                              color: tag.color,
                              background: tag.bgColor,
                              borderWidth: 1,
                            }}
                            onClick={() => onFilterByTag(tag)}
                            aria-hidden
                          >
                            {tag.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="divider m-0 mt-2 p-0" />
                  <div className="mt-2 flex flex-row items-center">
                    <input
                      type="text"
                      placeholder="Type tag label"
                      className="input input-bordered input-sm w-full mr-2 max-w-xs"
                      value={addTagLabel}
                      onChange={(e) => setAddTagLabel(e.target.value)}
                      onKeyDown={(e) => onAddTagKeyPress(e)}
                    />
                    <ColorPicker
                      color={addTagBgColor}
                      onChange={(color) => setAddTagBgColor(color)}
                    />
                    <a
                      type="button"
                      href="#images"
                      className="btn btn-sm ml-1"
                      onClick={() => addTag()}
                    >
                      Add
                    </a>
                  </div>
                </div>
              </ul>
            </button>
          </li>
          <li
            className="tooltip tooltip-right"
            data-tip={showTag ? `show tags` : 'hide tags'}
          >
            <button type="button" onClick={() => setShowTag(!showTag)}>
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
            data-tip={`image animated: ${imageAnimated ? 'on' : 'off'}`}
          >
            <button
              type="button"
              onClick={() => setImageAnimated(!imageAnimated)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={classNames([
                  'w-5 h-5',
                  { 'stroke-green-500': imageAnimated },
                ])}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
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
          <li className="dropdown dropdown-right">
            <button type="button">
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
                  onClick={(rating) => filterImagesByRating(rating)}
                  hidden={filterByRating === 0}
                />
              </ul>
            </button>
          </li>
          <li className="tooltip tooltip-right" data-tip="sort by rating asc">
            <button type="button" onClick={() => sortFilterImages('ratingAsc')}>
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
          <li className="tooltip tooltip-right" data-tip="sort by desc">
            <button
              type="button"
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
                  d="M4.5 12.75l7.5-7.5 7.5 7.5m-15 6l7.5-7.5 7.5 7.5"
                />
              </svg>
            </button>
          </li>
          <li className="tooltip tooltip-right" data-tip="sort by asc">
            <button type="button" onClick={() => sortFilterImages('rowNumAsc')}>
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
                  d="M19.5 5.25l-7.5 7.5-7.5-7.5m15 6l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>
          </li>
          <li className="tooltip tooltip-right" data-tip="sort by name asc">
            <button type="button" onClick={() => sortFilterImages('nameAsc')}>
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
                  d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25"
                />
              </svg>
            </button>
          </li>
          <li className="tooltip tooltip-right" data-tip="sort by name desc">
            <button type="button" onClick={() => sortFilterImages('nameDesc')}>
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
                  d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12"
                />
              </svg>
            </button>
          </li>
          <li
            className="tooltip tooltip-right"
            data-tip="update images database"
          >
            <button type="button" onClick={() => updateImagesDb()}>
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
            <button type="button" onClick={() => toggleImagesDeleteState()}>
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
      <div className="flex flex-col" style={{ width: `calc(100% - 68px)` }}>
        <div className="px-10 py-10">
          <VirtualScroll
            id={virtualScrollId}
            saveState
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
      </div>
    </div>
  );
}
