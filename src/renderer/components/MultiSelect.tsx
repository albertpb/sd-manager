import { KeyboardEvent, MouseEvent } from 'react';

export default function MultiSelect({
  value,
  options,
  onChange,
  isSearchable,
}: {
  value: any;
  options: any;
  onChange: (
    e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
    value: any,
  ) => void;
  isSearchable?: boolean;
}) {
  return (
    <div></div>
  );
}
