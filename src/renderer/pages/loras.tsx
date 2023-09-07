import Fuse from 'fuse.js';
import { useSelector } from 'react-redux';
import { RootState } from 'renderer/redux';
import ModelCard from 'renderer/components/ModelCard';
import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import VirtualScroll, {
  VirtualScrollData,
} from 'renderer/components/VirtualScroll';
import { Model } from 'main/ipc/readdirModels';

interface RowData {
  row: Fuse.FuseResult<Model>[];
  id: string;
}

export default function Loras() {
  const navigate = useNavigate();
  const loras = useSelector((state: RootState) => state.global.loras);
  const settings = useSelector((state: RootState) => state.global.settings);
  const navbarSearchInput = useSelector(
    (state: RootState) => state.global.navbarSearchInput
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);

  const [width, setWidth] = useState(320);
  const [height, setHeight] = useState(480);
  const [perChunk, setPerChunk] = useState(4);
  const [buffer, setBuffer] = useState(3);
  const rowMargin = 10;

  const onClick = (name: string) => {
    navigate(`/model-detail/loras/${name}`);
  };

  const modelsList = Object.values(loras.filesInfo);
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
      const imagePath = `${settings.lorasPath}\\${item.name}\\${item.name}_0.png`;
      return (
        <div
          onClick={() => onClick(item.name)}
          key={`${item.hash}_${item.name}`}
          aria-hidden="true"
        >
          <ModelCard
            name={item.name}
            imagePath={imagePath}
            width={`${width}px`}
            height={`${height}px`}
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
    <div ref={setRef} className="W-full h-full">
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
  );
}
