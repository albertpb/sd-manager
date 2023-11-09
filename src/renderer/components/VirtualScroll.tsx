import React, {
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

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto overflow-x-hidden my-5"
      style={{ height: settings.containerHeight }}
    >
      <div
        style={{
          height: data.length * rowHeight,
          paddingTop,
          paddingBottom,
        }}
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
      </div>
    </div>
  );
}
