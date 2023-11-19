import classNames from 'classnames';
import React, {
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
  onSelectItems?: (selectedItems: boolean[]) => void;
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
  onSelectItems,
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
  const [isShiftPressed, setIsShiftPressed] = useState<boolean>(false);

  const [holdStarter, setHoldStarter] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [holdActive, setHoldActive] = useState<boolean>(false);
  const HOLD_DELAY = 200;

  const [mouseDrawing, setMouseDrawing] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedItemsRef = useRef<boolean[]>([]);

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
      const itemWidth = settings.selectable.itemWidth + 17.5;
      const itemHeight = settings.selectable.itemHeight + 10.3;

      const startIndex = Math.max(0, visibleRange.start);

      const arr = [...selectedItems];
      visibleData.forEach((row, i) => {
        const realIndex = i + startIndex * settings.cols;

        const currentRow = Math.floor(i / settings.cols) + startIndex;
        const coords = {
          x: (i % settings.cols) * itemWidth,
          y: currentRow * itemHeight,
          width: itemWidth,
          height: itemHeight,
        };

        const isSelected = areBoxesIntersecting(coords, draggableArea);

        if (isShiftPressed) {
          if (
            (selectedItemsRef.current[realIndex] === false ||
              selectedItemsRef.current[realIndex] === undefined) &&
            isSelected
          ) {
            arr[realIndex] = true;
          }

          if (selectedItemsRef.current[realIndex] === true && isSelected) {
            arr[realIndex] = false;
          }
        } else {
          arr[realIndex] = isSelected;
        }
      });

      setSelectedItems(arr);

      if (onSelectItems) {
        onSelectItems(arr);
      }
    }
  }, [
    draggableArea,
    settings.cols,
    settings.selectable,
    visibleData,
    visibleRange.start,
    selectedItems,
    onSelectItems,
    isShiftPressed,
  ]);

  const autoScroll = (
    e: React.MouseEvent<HTMLElement>,
    containerElement: HTMLDivElement,
  ) => {
    if (e.clientY > containerElement.clientHeight - 100) {
      containerElement.scrollTo({
        top: containerElement.scrollTop + 10,
        behavior: 'instant',
      });
    }

    if (e.clientY < 100) {
      containerElement.scrollTo({
        top: containerElement.scrollTop - 10,
        behavior: 'instant',
      });
    }
  };

  const onMouseMoving = (e: React.MouseEvent<HTMLElement>) => {
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

        autoScroll(e, containerElement);
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

  const onMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (settings.selectable?.enabled) {
      if (containerRef.current && e.button === 0) {
        setHoldStarter(
          setTimeout(() => {
            setHoldStarter(null);
            setHoldActive(true);
          }, HOLD_DELAY),
        );
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

        selectedItemsRef.current = [...selectedItems];
      }
    }
  };

  const onMouseUp = (e: React.MouseEvent<HTMLElement>) => {
    if (e.button === 0) {
      if (holdStarter) {
        clearTimeout(holdStarter);
        // clicked immediately

        setSelectedItems([]);
        if (onSelectItems) {
          onSelectItems([]);
        }
        onStopDrawing();
      } else if (holdActive) {
        // beeing held, cancel held
        setHoldActive(false);
      }
    }
  };

  const onContextMenu = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      containerRef.current &&
      settings.selectable &&
      selectedItems.filter((s) => s === true).length <= 1
    ) {
      const containerElement = containerRef.current;

      const sCoords = {
        x:
          e.clientX + containerElement.scrollLeft - containerElement.offsetLeft,
        y: e.clientY + containerElement.scrollTop - containerElement.offsetTop,
      };

      selectedItemsRef.current = [];

      const width = 10;
      const height = 10;

      const box = {
        width: Math.abs(width),
        height: Math.abs(height),
        x: width > 0 ? sCoords.x : sCoords.x + width,
        y: height > 0 ? sCoords.y : sCoords.y + height,
      };

      const itemWidth = settings.selectable.itemWidth + 17.5;
      const itemHeight = settings.selectable.itemHeight + 10.3;

      const startIndex = Math.max(0, visibleRange.start);

      const arr = [...selectedItems];
      visibleData.forEach((row, i) => {
        const realIndex = i + startIndex * settings.cols;

        const currentRow = Math.floor(i / settings.cols) + startIndex;
        const coords = {
          x: (i % settings.cols) * itemWidth,
          y: currentRow * itemHeight,
          width: itemWidth,
          height: itemHeight,
        };

        const isSelected = areBoxesIntersecting(coords, box);

        arr[realIndex] = isSelected;
      });

      setSelectedItems(arr);

      if (onSelectItems) {
        onSelectItems(arr);
      }
    }
  };

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

  useEffect(() => {
    const keydownCb = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }

      if (e.ctrlKey && e.key === 'f') {
        setSelectedItems([]);
        if (onSelectItems) {
          onSelectItems([]);
        }
      }
    };

    const keyupCb = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    document.addEventListener('keydown', keydownCb);
    document.addEventListener('keyup', keyupCb);

    return () => {
      document.removeEventListener('keydown', keydownCb);
      document.removeEventListener('keyup', keyupCb);
    };
  }, [onSelectItems]);

  useEffect(() => {
    const windowClickCb = (e: MouseEvent) => {
      if (containerRef.current) {
        const boundingBox = containerRef.current.getBoundingClientRect();
        // clicked outside
        if (
          e.clientX < boundingBox.left ||
          e.clientX > boundingBox.right ||
          e.clientY < boundingBox.top ||
          e.clientY > boundingBox.bottom
        ) {
          setSelectedItems([]);
          if (onSelectItems) {
            onSelectItems([]);
          }
        }
      }
    };

    document.addEventListener('click', windowClickCb);

    return () => document.removeEventListener('click', windowClickCb);
  }, [mouseDrawing, onSelectItems]);

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
      onMouseDown={(e) => onMouseDown(e)}
      onMouseUp={(e) => onMouseUp(e)}
      onContextMenu={(e) => onContextMenu(e)}
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
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          height: rows * rowHeight,
          paddingTop,
          paddingBottom,
          pointerEvents: 'auto',
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
