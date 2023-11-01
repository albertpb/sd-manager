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
        aria-hidden
        onClick={() => onClick && onClick(1)}
        onChange={() => {}}
      />
      <input
        type="radio"
        name="rating-2"
        className="mask mask-star-2 bg-orange-400"
        checked={value === 2}
        aria-hidden
        onClick={() => onClick && onClick(2)}
        onChange={() => {}}
      />
      <input
        type="radio"
        name="rating-2"
        className="mask mask-star-2 bg-orange-400"
        checked={value === 3}
        aria-hidden
        onClick={() => onClick && onClick(3)}
        onChange={() => {}}
      />
      <input
        type="radio"
        name="rating-2"
        className="mask mask-star-2 bg-orange-400"
        checked={value === 4}
        aria-hidden
        onClick={() => onClick && onClick(4)}
        onChange={() => {}}
      />
      <input
        type="radio"
        name="rating-2"
        className="mask mask-star-2 bg-orange-400"
        checked={value === 5}
        aria-hidden
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
