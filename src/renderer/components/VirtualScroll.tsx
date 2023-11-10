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

interface Settings {
  rowHeight: number;
  rowMargin: number;
  buffer: number;
  tolerance: number;
  containerHeight: number;
}

export type VirtualScrollData = {
  id: string;
  [key: string]: any;
};

type VirtualScrollProps = {
  id: string;
  saveState?: boolean;
  settings: Settings;
  data: VirtualScrollData[];
  rowRenderer: (row: VirtualScrollData, index: number) => React.JSX.Element;
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
  rowRenderer,
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

  const [mouseDrawing, setMouseDrawing] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      const { scrollTop } = container;
      setScroll(scrollTop);

      const start = Math.floor(scrollTop / rowHeight);
      const end = Math.min(
        start + Math.ceil(settings.containerHeight / rowHeight),
        data.length,
      );

      setVisibleRange({
        start: start - settings.tolerance < 0 ? 0 : start - settings.tolerance,
        end:
          end + settings.tolerance > data.length
            ? data.length
            : end + settings.tolerance,
      });
    }
  }, [settings.containerHeight, data.length, rowHeight, settings.tolerance]);

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

  const visibleData = data.slice(
    Math.max(0, visibleRange.start),
    Math.min(data.length, visibleRange.end),
  );

  const paddingTop = visibleRange.start * rowHeight;
  const paddingBottom = (data.length - visibleRange.end) * rowHeight;

  const onContainerClick = (e: MouseEvent<HTMLElement>) => {
    if (mouseDrawing && containerRef.current) {
      const width =
        e.clientX +
        containerRef.current.scrollLeft -
        startCoords.x -
        containerRef.current.offsetLeft;
      const height =
        e.clientY +
        containerRef.current.scrollTop -
        startCoords.y -
        containerRef.current.offsetTop;

      const box = {
        width: Math.abs(width),
        height: Math.abs(height),
        x: width > 0 ? startCoords.x : startCoords.x + width,
        y: height > 0 ? startCoords.y : startCoords.y + height,
      };
      setDragableArea(box);
    }
  };

  const onStartDrawing = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setMouseDrawing(true);
    if (containerRef.current) {
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
    }
  };

  const onStopDrawing = () => {
    setMouseDrawing(false);
    setDragableArea({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  };

  useEffect(() => {
    window.addEventListener('mouseup', onStopDrawing);

    return () => window.removeEventListener('mouseup', onStopDrawing);
  }, []);

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto overflow-x-hidden my-5 relative"
      style={{ height: settings.containerHeight }}
      onMouseMove={(e) => onContainerClick(e)}
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
          height: data.length * rowHeight,
          paddingTop,
          paddingBottom,
        }}
        className={classNames([{ noselect: mouseDrawing }])}
      >
        {visibleData.map((item, index) => (
          <div
            id={`vs_${item.id}`}
            key={`vs_${item.id}`}
            style={{
              height: rowHeight - settings.rowMargin,
              marginBottom: settings.rowMargin,
            }}
          >
            {rowRenderer(item, index)}
          </div>
        ))}
        d
      </div>
    </div>
  );
}
