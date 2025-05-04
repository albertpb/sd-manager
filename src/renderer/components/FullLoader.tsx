export function FullLoader({
  title,
  progress,
  message,
}: {
  title?: string;
  progress?: number;
  message?: string;
}) {
  return (
    <div className="w-full flex flex-col justify-center items-center h-screen">
      <div className="stats">
        <div className="stat place-items-center">
          <div className="stat-title text-lg">{title}</div>
          {progress !== undefined ? (
            <div className="stat-value">{progress.toFixed(2)}%</div>
          ) : (
            <span className="loading loading-spinner loading-md" />
          )}
          {message && <div className="stat-desc">{message}</div>}
        </div>
      </div>
      {progress !== undefined && (
        <progress className="progress w-56" value={progress} max="100" />
      )}
    </div>
  );
}
