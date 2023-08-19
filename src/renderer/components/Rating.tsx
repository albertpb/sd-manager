export default function Rating({ rating }: { rating: number }) {
  const stars = Array(5)
    .fill('')
    .map((_, i) => {
      return (
        <input
          type="radio"
          name="rating-2"
          className="mask mask-star-2 bg-orange-400"
          value={i}
          checked={i === rating}
        />
      );
    });

  return <div className="rating">{stars}</div>;
}
