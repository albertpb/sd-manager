import { ReactNode, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { init, readCheckpointsDir, readLorasDir } from './reducers/global';
import { AppDispatch, RootState } from '.';

export default function ModelsLoader({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const checkpointsLoading = useSelector(
    (state: RootState) => state.global.checkpointsLoading
  );
  const lorasLoading = useSelector(
    (state: RootState) => state.global.lorasLoading
  );
  const initialized = useSelector(
    (state: RootState) => state.global.initialized
  );
  const settings = useSelector((state: RootState) => state.global.settings);

  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const load = async () => {
      if (!initialized) {
        await dispatch(readCheckpointsDir());
        await dispatch(readLorasDir());
        window.ipcHandler.watchImagesFolder(settings.imagesPath);
        dispatch(init());
      }
    };
    load();
  }, [dispatch, initialized, settings.imagesPath]);

  useEffect(() => {
    window.ipcOn.modelsProgress((event, m, p) => {
      setMsg(m);
      setProgress(p);
    });
  }, [msg, progress]);

  if (checkpointsLoading || lorasLoading) {
    return (
      <div className="w-full flex flex-col justify-center items-center h-screen">
        <div className="stats">
          <div className="stat place-items-center">
            <div className="stat-title">Hashing Files</div>
            <div className="stat-value">{progress.toFixed(2)}%</div>
            <div className="stat-desc">{msg}</div>
          </div>
        </div>
        <progress className="progress w-56" value={progress} max="100" />
      </div>
    );
  }

  return children;
}
