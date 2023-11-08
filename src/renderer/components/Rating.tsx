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
  const click = (e: MouseEvent<HTMLInputElement>, v: number) => {
    const target = e.target as HTMLInputElement;
    target.blur();
    if (onClick) {
      onClick(e, v);
    }
  };

  const stars = (
    <>
      <input
        type="radio"
        name={`${id}_rating-2`}
        className="mask mask-star-2 bg-orange-400"
        checked={value === 1}
        onClick={(e) => click(e, 1)}
        onChange={() => {}}
      />
      <input
        type="radio"
        name={`${id}_rating-2`}
        className="mask mask-star-2 bg-orange-400"
        checked={value === 2}
        onClick={(e) => click(e, 2)}
        onChange={() => {}}
      />
      <input
        type="radio"
        name={`${id}_rating-2`}
        className="mask mask-star-2 bg-orange-400"
        checked={value === 3}
        onClick={(e) => click(e, 3)}
        onChange={() => {}}
      />
      <input
        type="radio"
        name={`${id}_rating-2`}
        className="mask mask-star-2 bg-orange-400"
        checked={value === 4}
        onClick={(e) => click(e, 4)}
        onChange={() => {}}
      />
      <input
        type="radio"
        name={`${id}_rating-2`}
        className="mask mask-star-2 bg-orange-400"
        checked={value === 5}
        onClick={(e) => click(e, 5)}
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
