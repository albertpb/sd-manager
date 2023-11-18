import { useSelector } from 'react-redux';
import { RootState } from 'renderer/redux';
import { ImportProgress } from 'renderer/redux/reducers/global';

type StatusBarProps = {
  filteredCards?: number;
  totalCards?: number;
  checkpointsImportProgress: ImportProgress;
  lorasImportProgress: ImportProgress;
  imagesImportProgress: ImportProgress;
};

export default function StatusBar({
  filteredCards,
  totalCards,
  checkpointsImportProgress,
  lorasImportProgress,
  imagesImportProgress,
}: StatusBarProps) {
  const checkpointsLoading = useSelector(
    (state: RootState) => state.global.checkpoint.loading,
  );

  const lorasLoading = useSelector(
    (state: RootState) => state.global.lora.loading,
  );
  const imagesLoading = useSelector(
    (state: RootState) => state.global.image.loading,
  );

  return (
    <ul
      className="menu bg-base-200 border-t border-l border-base-300 shadow-2xl w-full p-0 m-0 items-center self-end text-xs"
      style={{ height: '20px' }}
    >
      <div className="self-end mr-4 flex flex-row">
        {checkpointsLoading && (
          <div className="h-full flex items-center mr-4">
            <span className="mr-2">
              Loading checkpoints: {checkpointsImportProgress.message}{' '}
              {checkpointsImportProgress.progress}%
            </span>
            <progress
              className="progress progress-primary w-56"
              value={checkpointsImportProgress.progress}
              max="100"
            />
          </div>
        )}
        {lorasLoading && (
          <div className="h-full flex items-center mr-4">
            <span className="mr-2">
              Loading loras: {lorasImportProgress.message}{' '}
              {lorasImportProgress.progress.toFixed(2)}%
            </span>
            <progress
              className="progress progress-primary w-56"
              value={lorasImportProgress.progress}
              max="100"
            />
          </div>
        )}
        {imagesLoading && (
          <div className="h-full flex items-center mr-4">
            <span className="mr-2">
              Loading images: {imagesImportProgress.message}{' '}
              {imagesImportProgress.progress.toFixed(2)}%
            </span>
            <progress
              className="progress progress-primary w-56"
              value={0}
              max="100"
            />
          </div>
        )}
        {filteredCards !== undefined && (
          <button type="button" className="h-full flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
              />
            </svg>

            <span className="ml-1">filtered: {filteredCards}</span>
          </button>
        )}
        {totalCards !== undefined && (
          <button type="button" className="h-full flex items-center ml-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            <span className="ml-1">total: {totalCards}</span>
          </button>
        )}
      </div>
    </ul>
  );
}
