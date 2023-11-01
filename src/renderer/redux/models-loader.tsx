import { IpcRendererEvent } from 'electron';
import { ReactNode, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { init, readCheckpoints, readLoras } from './reducers/global';
import { AppDispatch, RootState } from '.';

export default function ModelsLoader({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const initialized = useSelector(
    (state: RootState) => state.global.initialized,
  );
  const settings = useSelector((state: RootState) => state.global.settings);

  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const load = async () => {
      if (!initialized) {
        if (settings.scanModelsOnStart) {
          await window.ipcHandler.readdirModels(
            'checkpoint',
            settings.checkpointsPath,
          );
          await window.ipcHandler.readdirModels('lora', settings.lorasPath);
        }
        await dispatch(readCheckpoints());
        await dispatch(readLoras());
        window.ipcHandler.watchImagesFolder();
        dispatch(init());
      }
    };
    load();
  }, [
    dispatch,
    initialized,
    settings.checkpointsPath,
    settings.lorasPath,
    settings.scanModelsOnStart,
  ]);

  useEffect(() => {
    const cb = (event: IpcRendererEvent, m: string, p: number) => {
      setMsg(m);
      setProgress(p);
    };

    const remove = window.ipcOn.modelsProgress(cb);

    return () => remove();
  }, []);

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
