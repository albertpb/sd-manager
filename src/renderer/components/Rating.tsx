import classNames from 'classnames';
import { MouseEvent } from 'react';

export default function Rating({
  id,
  value,
  onClick,
  hidden,
}: {
  id: string;
  value: number;
  onClick?: (event: MouseEvent<HTMLInputElement>, value: number) => void;
  hidden?: boolean;
}) {
  const stars = (
    <>
      <input
        type="radio"
        name={`${id}_rating-2`}
        className="mask mask-star-2 bg-orange-400"
        checked={value === 1}
        onClick={(e) => onClick && onClick(e, 1)}
        onChange={() => {}}
      />
      <input
        type="radio"
        name={`${id}_rating-2`}
        className="mask mask-star-2 bg-orange-400"
        checked={value === 2}
        onClick={(e) => onClick && onClick(e, 2)}
        onChange={() => {}}
      />
      <input
        type="radio"
        name={`${id}_rating-2`}
        className="mask mask-star-2 bg-orange-400"
        checked={value === 3}
        onClick={(e) => onClick && onClick(e, 3)}
        onChange={() => {}}
      />
      <input
        type="radio"
        name={`${id}_rating-2`}
        className="mask mask-star-2 bg-orange-400"
        checked={value === 4}
        onClick={(e) => onClick && onClick(e, 4)}
        onChange={() => {}}
      />
      <input
        type="radio"
        name={`${id}_rating-2`}
        className="mask mask-star-2 bg-orange-400"
        checked={value === 5}
        onClick={(e) => onClick && onClick(e, 5)}
        onChange={() => {}}
      />
    </>
  );

  return (
    <div
      className={classNames([
        'rating',
        {
          'rating-hidden': hidden,
        },
      ])}
    >
      {stars}
    </div>
  );
}
