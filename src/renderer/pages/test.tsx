import VirtualScroll, {
  VirtualScrollData,
} from 'renderer/components/VirtualScroll';

const arr: VirtualScrollData[] = Array.from(Array(1000).keys()).map((n) => {
  return {
    id: `${n}`,
  };
});
export default function Testing() {
  const row = (item: VirtualScrollData, index: number) => (
    <div>
      {index} - {item.id}
    </div>
  );

  return (
    <div>
      <VirtualScroll
        settings={{
          buffer: 10,
          rowHeight: 40,
          tolerance: 4,
          rowMargin: 5,
        }}
        data={arr}
        rowRenderer={row}
      />
    </div>
  );
}
