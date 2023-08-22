import React, { useEffect, useMemo, useRef, useState } from 'react';

interface Settings {
  rowHeight: number;
  rowMargin: number;
  buffer: number;
  tolerance: number;
}

export type VirtualScrollData = {
  id: string;
  [key: string]: any;
};

type VirtualScrollProps = {
  settings: Settings;
  data: VirtualScrollData[];
  rowRenderer: (row: VirtualScrollData, index: number) => React.JSX.Element;
};

export default function VirtualScroll({
  settings,
  data,
  rowRenderer,
}: VirtualScrollProps) {
  const rowHeight = useMemo(
    () => settings.rowHeight + settings.rowMargin,
    [settings.rowHeight, settings.rowMargin]
  );
  const containerHeight = useMemo(
    () => rowHeight * settings.buffer,
    [rowHeight, settings.buffer]
  );

  const [visibleRange, setVisibleRange] = useState({
    start: 0,
    end: Math.ceil(containerHeight / rowHeight),
  });
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current;
      if (container) {
        const { scrollTop } = container;
        const start = Math.floor(scrollTop / rowHeight);
        const end = Math.min(
          start + Math.ceil(containerHeight / rowHeight),
          data.length
        );

        setVisibleRange({
          start:
            start - settings.tolerance < 0 ? 0 : start - settings.tolerance,
          end:
            end + settings.tolerance > data.length
              ? data.length
              : end + settings.tolerance,
        });
      }
    };

    handleScroll();
    const container = containerRef.current;
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, [containerHeight, data.length, rowHeight, settings.tolerance]);

  const visibleData = data.slice(
    Math.max(0, visibleRange.start),
    Math.min(data.length, visibleRange.end)
  );

  const paddingTop = visibleRange.start * rowHeight;
  const paddingBottom = (data.length - visibleRange.end) * rowHeight;

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto overflow-x-hidden"
      style={{ height: containerHeight }}
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
