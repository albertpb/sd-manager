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

  const [loaded, setLoaded] = useState<boolean>(false);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [deleteActive, setDeleteActive] = useState<boolean>(false);

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

  const onClick = (hash: string) => {
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
          onClick={() => onClick(item.hash)}
          aria-hidden="true"
        >
          <figure
            className="card__figure rounded-md overflow-hidden relative"
            style={{
              width: `${width}px`,
              height: `${height}px`,
            }}
          >
            <div className="absolute top-2 right-2 z-20">
              <Rating value={item.rating} />
            </div>
            <Image
              src={`${item.path}\\${item.name}.thumbnail.png`}
              alt={`model_detail_model_image_${item.hash}`}
              height="100%"
              width="100%"
              className="object-cover"
              draggable={false}
            />
            <div className="absolute bottom-0 left-0 w-full p-3 flex flex-col">
              <p className="text font-bold text-white">{item.model}</p>
              <p className="text font-bold text-white">{item.name}</p>
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
          <li>
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
                  d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                />
              </svg>
            </button>
          </li>
          <li>
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
