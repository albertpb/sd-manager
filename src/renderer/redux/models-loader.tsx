import { ReactNode, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { init, readCheckpoints, readLoras } from './reducers/global';
import { AppDispatch, RootState } from '.';

export default function ModelsLoader({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const initialized = useSelector(
    (state: RootState) => state.global.initialized
  );
  const settings = useSelector((state: RootState) => state.global.settings);

  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const load = async () => {
      if (!initialized) {
        await window.ipcHandler.readdirModels(
          'checkpoint',
          settings.checkpointsPath
        );
        await window.ipcHandler.readdirModels('lora', settings.lorasPath);
        await dispatch(readCheckpoints());
        await dispatch(readLoras());
        window.ipcHandler.watchImagesFolder(settings.imagesPath);
        dispatch(init());
      }
    };
    load();
  }, [
    dispatch,
    initialized,
    settings.imagesPath,
    settings.checkpointsPath,
    settings.lorasPath,
  ]);

  useEffect(() => {
    window.ipcOn.modelsProgress((event, m, p) => {
      setMsg(m);
      setProgress(p);
    });
  }, [msg, progress]);

  if (!initialized) {
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
