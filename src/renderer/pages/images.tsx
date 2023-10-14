import classNames from 'classnames';
import Fuse from 'fuse.js';
import { IpcRendererEvent } from 'electron';
import { ImageRow } from 'main/ipc/organizeImages';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Image from 'renderer/components/Image';
import Rating from 'renderer/components/Rating';
import VirtualScroll, {
  VirtualScrollData,
} from 'renderer/components/VirtualScroll';
import { RootState } from 'renderer/redux';
import { setImagesToDelete } from 'renderer/redux/reducers/global';

interface RowData {
  row: Fuse.FuseResult<ImageRow>[];
  id: string;
}

export default function Images() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const virtualScrollId = 'images_virtualscroll';

  const [images, setImages] = useState<ImageRow[]>([]);
  const [rowNumber, setRowNumber] = useState<number>(3);
  const [imageAnimated, setImageAnimated] = useState<boolean>(true);
  const [deleteActive, setDeleteActive] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('ratingDesc');

  const navbarSearchInput = useSelector(
    (state: RootState) => state.global.navbarSearchInput
  );
  const imagesToDelete = useSelector(
    (state: RootState) => state.global.imagesToDelete
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);

  const [width, setWidth] = useState(320);
  const [height, setHeight] = useState(480);
  const [perChunk, setPerChunk] = useState(4);
  const [buffer, setBuffer] = useState(3);
  const maxRows = 3;
  const rowMargin = 10;

  useEffect(() => {
    const load = async () => {
      const imagesRows: ImageRow[] = await window.ipcHandler.getImages();
      setImages(imagesRows.sort((a, b) => b.rating - a.rating));
    };
    load();
  }, []);

  const sortImages = (sortByArg: string) => {
    switch (sortByArg) {
      case 'rowNumAsc': {
        const sortedImages = images.sort((a, b) => a.rowNum - b.rowNum);
        setImages(sortedImages);
        break;
      }

      case 'rowNumDesc': {
        const sortedImages = images.sort((a, b) => b.rowNum - a.rowNum);
        setImages(sortedImages);
        break;
      }

      case 'nameAsc': {
        const sortedImages = images.sort((a, b) => {
          if (a.name > b.name) return 1;
          if (a.name < b.name) return -1;
          return 0;
        });
        setImages(sortedImages);
        break;
      }

      case 'nameDesc': {
        const sortedImages = images.sort((a, b) => {
          if (b.name > a.name) return 1;
          if (b.name < a.name) return -1;
          return 0;
        });
        setImages(sortedImages);
        break;
      }

      case 'ratingAsc': {
        const sortedImages = images.sort((a, b) => a.rating - b.rating);
        setImages(sortedImages);
        break;
      }

      case 'ratingDesc':
      default: {
        const sortedImages = images.sort((a, b) => b.rating - a.rating);
        setImages(sortedImages);
        break;
      }
    }
    setSortBy(sortBy);
  };

  const calcImagesValues = useCallback(() => {
    const windowHeight = window.innerHeight;
    setContainerHeight(windowHeight - 150);

    const cardHeight = containerHeight / rowNumber - rowMargin;
    const cardWidth = (cardHeight * 2) / rowNumber;

    setHeight(cardHeight);
    setWidth(cardWidth);
    setBuffer(Math.floor(containerHeight / cardHeight));

    setPerChunk(
      Math.floor((window.innerWidth - window.innerHeight * 0.15) / cardWidth) ||
        1
    );
  }, [containerHeight, rowNumber]);

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

    const remove = window.ipcOn.detectedAddImage(cb);

    return () => remove();
  }, []);

  const fuse = new Fuse(images, {
    keys: ['model'],
  });

  const imagesResult =
    navbarSearchInput === ''
      ? images.map((image, i) => {
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

  const onImageClick = (hash: string) => {
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
  };

  const changeImageRow = () => {
    if (rowNumber >= maxRows) {
      setRowNumber(1);
    } else {
      setRowNumber(rowNumber + 1);
    }
  };

  const toggleImagesDeleteState = () => {
    setDeleteActive(!deleteActive);
    if (deleteActive) {
      dispatch(setImagesToDelete({}));
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
        rowNumber <= 2
          ? `${item.path}\\${item.name}.png`
          : `${item.path}\\${item.name}.thumbnail.png`;

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
          onClick={() => onImageClick(item.hash)}
          aria-hidden="true"
        >
          <figure
            className={classNames([
              'card__figure rounded-md overflow-hidden relative',
              {
                animated: imageAnimated,
              },
            ])}
            style={{
              width: `${width}px`,
              height: `${height}px`,
            }}
          >
            <div className="absolute top-2 right-2 z-20">
              <Rating value={item.rating} />
            </div>
            <Image
              src={imageSrc}
              alt={`model_detail_model_image_${item.hash}`}
              height="100%"
              width="100%"
              className={classNames({
                'object-contain': rowNumber === 1,
                'object-left': rowNumber === 1,
                'object-cover': rowNumber >= 2,
              })}
              draggable={false}
            />
            <div className="absolute bottom-0 left-0 w-full p-3 flex flex-col">
              <p className="text font-bold text-white">{item.model}</p>
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
    <div ref={setRef} className="W-full h-full flex">
      <div className="w-fit h-full">
        <ul className="menu bg-base-200 border-t border-base-300 h-full pt-10">
          <li className="tooltip tooltip-right" data-tip={`rows ${rowNumber}`}>
            <button type="button" onClick={() => changeImageRow()}>
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
          <li className="tooltip tooltip-right" data-tip="sort by rating asc">
            <button type="button" onClick={() => sortImages('ratingAsc')}>
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
            <button type="button" onClick={() => sortImages('ratingDesc')}>
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
            <button type="button" onClick={() => sortImages('rowNumDesc')}>
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
            <button type="button" onClick={() => sortImages('rowNumAsc')}>
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
            <button type="button" onClick={() => sortImages('nameAsc')}>
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
            <button type="button" onClick={() => sortImages('nameDesc')}>
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
      <div className="pt-10 pl-10" style={{ width: `calc(100% - 68px)` }}>
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
  );
}
