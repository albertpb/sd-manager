import classNames from 'classnames';

export default function Rating({
  value,
  onClick,
  hidden,
}: {
  value: number;
  onClick?: (value: number) => void;
  hidden?: boolean;
}) {
  const stars = (
    <>
      <input
        type="radio"
        name="rating-2"
        className="mask mask-star-2 bg-orange-400"
        checked={value === 1}
        aria-checked={value === 1}
        onClick={() => onClick && onClick(1)}
        onChange={() => {}}
      />
      <input
        type="radio"
        name="rating-2"
        className="mask mask-star-2 bg-orange-400"
        checked={value === 2}
        aria-checked={value === 2}
        onClick={() => onClick && onClick(2)}
        onChange={() => {}}
      />
      <input
        type="radio"
        name="rating-2"
        className="mask mask-star-2 bg-orange-400"
        checked={value === 3}
        aria-checked={value === 3}
        onClick={() => onClick && onClick(3)}
        onChange={() => {}}
      />
      <input
        type="radio"
        name="rating-2"
        className="mask mask-star-2 bg-orange-400"
        checked={value === 4}
        aria-checked={value === 4}
        onClick={() => onClick && onClick(4)}
        onChange={() => {}}
      />
      <input
        type="radio"
        name="rating-2"
        className="mask mask-star-2 bg-orange-400"
        checked={value === 5}
        aria-checked={value === 5}
        onClick={() => onClick && onClick(5)}
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
