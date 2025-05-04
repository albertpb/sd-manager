import { KeyboardEvent, MouseEvent } from 'react';
import ReactTwSelect from 'react-tailwindcss-select';
import {
  SelectValue,
  Option,
} from 'react-tailwindcss-select/dist/components/type';

export default function MultiSelect({
  value,
  options,
  onChange,
  isSearchable,
}: {
  value: Option[];
  options: Option[];
  onChange: (
    e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
    value: SelectValue,
  ) => void;
  isSearchable?: boolean;
}) {
  return (
    <ReactTwSelect
      classNames={{
        menuButton: (v) =>
          `flex text-sm border rounded-xl border-base-content bg-base-100 border-opacity-20 shadow-sm transition-all duration-300 focus:outline-none ${
            v?.isDisabled
              ? 'bg-neutral'
              : 'bg-base-100 focus:border-blue-500 focus:ring focus:ring-blue-500/20'
          }`,
        menu: 'absolute z-10 w-full bg-base-100 shadow-sm rounded-xl border border-base-content border-opacity-20 py-1 mt-1.5 text-sm text-gray-700',
        listItem: (v) =>
          `bg-base-100 block transition duration-200 py-2 cursor-pointer select-none truncate rounded ${
            v?.isSelected
              ? `bg-neutral text-white`
              : `hover:bg-neutral-focus text-accent hover:text-secondary-500`
          }`,
        list: 'bg-base-100 mx-2',
        ChevronIcon: (v) => `text-base-content ${v?.open ? `` : ``}`,
        tagItem: (v) => {
          let className = 'badge badge-outline badge-primary';
          if (v?.isDisabled || v?.item?.disabled) {
            className += 'badge-neutral';
          }

          return className;
        },
        tagItemIcon: 'w-3 h-3 mt-0.5 outline-primary',
        tagItemIconContainer:
          'flex items-center px-1 cursor-pointer rounded-r-sm hover:text-accent',
        tagItemText: 'text-primary',
        searchBox:
          'w-full py-2 pl-8 text-sm text-gray-500 bg-base-100 rounded-xl border border-base-content rounded border-opacity-20 focus:ring-0 focus:outline-none',
      }}
      options={options}
      value={value}
      onChange={(
        e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
        v: SelectValue,
      ) => onChange(e, v)}
      primaryColor="blue"
      isSearchable={isSearchable}
      isMultiple
    />
  );
}
