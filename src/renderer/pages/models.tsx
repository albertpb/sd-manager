import Fuse from 'fuse.js';
import { useSelector } from 'react-redux';
import { RootState } from 'renderer/redux';
import ModelCard from 'renderer/components/ModelCard';
import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import VirtualScroll, {
  VirtualScrollData,
} from 'renderer/components/VirtualScroll';
import { Model } from 'main/ipc/model';
import classNames from 'classnames';

interface RowData {
  row: Fuse.FuseResult<Model>[];
  id: string;
}

export default function Models({ type }: { type: 'checkpoint' | 'lora' }) {
  const navigate = useNavigate();
  const checkpoints = useSelector(
    (state: RootState) => state.global.checkpoints,
  );
  const loras = useSelector((state: RootState) => state.global.loras);
  const modelsState = type === 'checkpoint' ? checkpoints : loras;
  const settings = useSelector((state: RootState) => state.global.settings);
  const navbarSearchInput = useSelector(
    (state: RootState) => state.global.navbarSearchInput,
  );

  const [models, setModels] = useState<Model[]>(
    Object.values(modelsState.models),
  );
  const [filterBy, setFilterBy] = useState<string>('');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);

  const [rowNumber, setRowNumber] = useState<number>(3);
  const [width, setWidth] = useState(320);
  const [height, setHeight] = useState(480);
  const [perChunk, setPerChunk] = useState(4);
  const [buffer, setBuffer] = useState(3);
  const maxRows = 3;
  const rowMargin = 10;

  const onClick = (hash: string) => {
    navigate(`/model-detail/${hash}`);
  };

  const modelsList = Object.values(models).sort((a, b) => b.rating - a.rating);
  const fuse = new Fuse(modelsList, {
    keys: ['name'],
  });

  const resultCards =
    navbarSearchInput === ''
      ? modelsList.map((chkpt, i) => {
          return {
            item: chkpt,
            matches: [],
            score: 1,
            refIndex: i,
          };
        })
      : fuse.search(navbarSearchInput);

  const filterByBaseModel = (baseModel: string) => {
    if (baseModel === '') {
      setModels(Object.values(modelsState.models));
    } else if (baseModel === 'Other') {
      const filteredModels = Object.values(modelsState.models).filter(
        (model) => model.baseModel === 'Other' || model.baseModel === null,
      );
      setModels(filteredModels);
    } else {
      const filteredModels = Object.values(modelsState.models).filter(
        (model) => model.baseModel === baseModel,
      );
      setModels(filteredModels);
    }
    setFilterBy(baseModel);
  };

  const calcImagesValues = useCallback(() => {
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    setContainerHeight(windowHeight - 150);

    const cardHeight = containerHeight / rowNumber - rowMargin;
    const cardWidth = (cardHeight * 2) / rowNumber;
    setHeight(cardHeight);
    setWidth(cardWidth);
    setBuffer(Math.floor(containerHeight / cardHeight));

    setPerChunk(
      Math.floor((windowWidth - windowHeight * 0.15) / cardWidth) || 1,
    );
  }, [containerHeight, rowNumber]);

  const setRef = useCallback(
    (node: HTMLDivElement) => {
      containerRef.current = node;
      calcImagesValues();
    },
    [calcImagesValues],
  );

  const changeImageRow = () => {
    if (rowNumber >= maxRows) {
      setRowNumber(1);
    } else {
      setRowNumber(rowNumber + 1);
    }
  };

  useEffect(() => {
    if (type === 'checkpoint') {
      setModels(Object.values(checkpoints.models));
    }
    if (type === 'lora') {
      setModels(Object.values(loras.models));
    }
  }, [type, loras.models, checkpoints.models]);

  useEffect(() => {
    calcImagesValues();

    window.addEventListener('resize', calcImagesValues);

    return () => window.removeEventListener('resize', calcImagesValues);
  }, [containerRef, width, calcImagesValues]);

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

      return (
        <div
          onClick={() => onClick(item.hash)}
          key={`${item.hash}_${item.name}`}
          aria-hidden="true"
        >
          <ModelCard
            name={item.name}
            rating={item.rating}
            imagePath={imagePath}
            width={`${width}px`}
            height={`${height}px`}
            type={type}
            imageClassName={{
              'object-contain': rowNumber === 1,
              'object-left': rowNumber === 1,
              'object-cover': rowNumber >= 2,
            }}
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
          <li className="tooltip tooltip-right" data-tip="All">
            <button type="button" onClick={() => filterByBaseModel('')}>
              <span
                className={classNames([
                  'w-5 h-5',
                  {
                    'text-green-500': filterBy === '',
                  },
                ])}
              >
                All
              </span>
            </button>
          </li>
          <li className="tooltip tooltip-right" data-tip="SD 1.5">
            <button type="button" onClick={() => filterByBaseModel('SD 1.5')}>
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
            <button type="button" onClick={() => filterByBaseModel('SDXL 1.0')}>
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
            <button type="button" onClick={() => filterByBaseModel('Other')}>
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
        </ul>
      </div>
      <div className="pt-10 pl-10" style={{ width: `calc(100% - 68px)` }}>
        <VirtualScroll
          id={`${type}_virtualscroll`}
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
