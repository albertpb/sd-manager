import classNames from 'classnames';
import React, {
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useOnUnmount from 'renderer/hooks/useOnUnmount';
import { areBoxesIntersecting } from 'renderer/utils';

interface Settings {
  rowHeight: number;
  rowMargin: number;
  buffer: number;
  tolerance: number;
  containerHeight: number;
  cols: number;
  selectable?: {
    enabled: boolean;
    itemWidth: number;
    itemHeight: number;
    total: number;
  };
}

type VirtualScrollProps = {
  id: string;
  saveState?: boolean;
  settings: Settings;
  data: any[];
  render(
    visibleData: any[],
    selectedItems?: boolean[],
  ): React.JSX.Element | React.JSX.Element[];
};

export const clearSessionStorage = (id: string) => {
  window.sessionStorage.removeItem(`virtualScroll_${id}`);
};

type DraggableArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function VirtualScroll({
  id,
  saveState = false,
  settings,
  data,
  render,
}: VirtualScrollProps) {
  const rowHeight = useMemo(
    () => settings.rowHeight + settings.rowMargin,
    [settings.rowHeight, settings.rowMargin],
  );

  const [visibleRange, setVisibleRange] = useState({
    start: 0,
    end: Math.ceil(settings.containerHeight / rowHeight),
  });
  const [scroll, setScroll] = useState<number>(0);
  const [startCoords, setStartCoords] = useState({
    x: 0,
    y: 0,
  });
  const [draggableArea, setDragableArea] = useState<DraggableArea>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [selectedItems, setSelectedItems] = useState<boolean[]>([]);

  const [mouseDrawing, setMouseDrawing] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const rows = Math.ceil(data.length / settings.cols);

  const visibleData = data.slice(
    Math.max(0, visibleRange.start * settings.cols),
    Math.min(data.length, visibleRange.end * settings.cols),
  );

  const visibleSelected = settings.selectable?.enabled
    ? selectedItems.slice(
        Math.max(0, visibleRange.start * settings.cols),
        Math.min(data.length, visibleRange.end * settings.cols),
      )
    : [];

  const paddingTop = visibleRange.start * rowHeight;
  const paddingBottom = (rows - visibleRange.end) * rowHeight;

  const detectSelectableItems = useCallback(() => {
    if (
      settings.selectable &&
      settings.selectable.enabled &&
      containerRef.current
    ) {
      const itemWidth = settings.selectable.itemWidth + 18.5;
      const itemHeight = settings.selectable.itemHeight + 18.5;

      const startIndex = Math.max(0, visibleRange.start);

      const arr = new Array(data.length).fill(false);
      visibleData.forEach((row, i) => {
        const currentRow = Math.floor(i / settings.cols) + startIndex;
        const coords = {
          x: (i % settings.cols) * itemWidth,
          y: currentRow * itemHeight,
          width: itemWidth,
          height: itemHeight,
        };

        const isSelected = areBoxesIntersecting(coords, draggableArea);

        const realIndex = i + startIndex * settings.cols;
        arr[realIndex] = isSelected;
      });

      setSelectedItems(arr);
    }
  }, [
    data.length,
    draggableArea,
    settings.cols,
    settings.selectable,
    visibleData,
    visibleRange.start,
  ]);

  const onMouseMoving = (e: MouseEvent<HTMLElement>) => {
    if (settings.selectable?.enabled) {
      if (mouseDrawing && containerRef.current) {
        const containerElement = containerRef.current;

        const width =
          e.clientX +
          containerElement.scrollLeft -
          startCoords.x -
          containerElement.offsetLeft;
        const height =
          e.clientY +
          containerElement.scrollTop -
          startCoords.y -
          containerElement.offsetTop;

        const box = {
          width: Math.abs(width),
          height: Math.abs(height),
          x: width > 0 ? startCoords.x : startCoords.x + width,
          y: height > 0 ? startCoords.y : startCoords.y + height,
        };
        setDragableArea(box);

        detectSelectableItems();
      }
    }
  };

  const onStartDrawing = (e: MouseEvent<HTMLElement>) => {
    if (settings.selectable?.enabled) {
      if (containerRef.current) {
        setMouseDrawing(true);
        setDragableArea({
          height: 0,
          width: 0,
          x:
            e.clientX +
            containerRef.current.scrollLeft -
            containerRef.current.offsetLeft,
          y:
            e.clientY +
            containerRef.current.scrollTop -
            containerRef.current.offsetTop,
        });
        setStartCoords({
          x:
            e.clientX +
            containerRef.current.scrollLeft -
            containerRef.current.offsetLeft,
          y:
            e.clientY +
            containerRef.current.scrollTop -
            containerRef.current.offsetTop,
        });

        setSelectedItems([]);
      }
    }
  };

  const onStopDrawing = useCallback(() => {
    if (settings.selectable?.enabled) {
      setMouseDrawing(false);
      setDragableArea({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
    }
  }, [settings.selectable?.enabled]);

  useEffect(() => {
    window.addEventListener('mouseup', onStopDrawing);

    return () => window.removeEventListener('mouseup', onStopDrawing);
  }, [onStopDrawing]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      const { scrollTop } = container;
      setScroll(scrollTop);

      const start = Math.floor(scrollTop / rowHeight);
      const end = Math.min(
        start + Math.ceil(settings.containerHeight / rowHeight),
        rows,
      );

      setVisibleRange({
        start: start - settings.tolerance < 0 ? 0 : start - settings.tolerance,
        end: end + settings.tolerance > rows ? rows : end + settings.tolerance,
      });
    }
  }, [settings.containerHeight, rowHeight, settings.tolerance, rows]);

  useEffect(() => {
    handleScroll();
    const container = containerRef.current;
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (containerRef.current) {
      const sessionStorageScroll = window.sessionStorage.getItem(
        `virtualScroll_${id}`,
      );
      if (sessionStorageScroll) {
        const scrollTop = parseInt(sessionStorageScroll, 10);
        containerRef.current.scrollTo(0, scrollTop);
        handleScroll();
      }
    }
  }, [handleScroll, id]);

  useOnUnmount(() => {
    if (saveState) {
      window.sessionStorage.setItem(`virtualScroll_${id}`, `${scroll}`);
    }
  }, [id, scroll, saveState]);

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto overflow-x-hidden my-5 relative"
      style={{ height: settings.containerHeight }}
      onMouseMove={(e) => onMouseMoving(e)}
      onMouseDown={(e) => onStartDrawing(e)}
      aria-hidden
    >
      <div
        className={classNames([
          'absolute z-50 border border-dashed bg-sky-600 opacity-50',
          {
            hidden: !mouseDrawing,
          },
        ])}
        style={{
          left: `${draggableArea.x}px`,
          top: `${draggableArea.y}px`,
          width: `${draggableArea.width}px`,
          height: `${draggableArea.height}px`,
        }}
      />
      <div
        style={{
          height: rows * rowHeight,
          paddingTop,
          paddingBottom,
        }}
        className={classNames([{ noselect: mouseDrawing }])}
      >
        <div
          style={{
            height: rowHeight - settings.rowMargin,
            marginBottom: settings.rowMargin,
          }}
        >
          {render(visibleData, visibleSelected)}
        </div>
      </div>
    </div>
  );
}
