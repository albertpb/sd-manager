import { IpcRendererEvent } from 'electron';
import { ReactNode, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FullLoader } from 'renderer/components/FullLoader';
import { readCheckpoints, readLoras } from './reducers/global';
import { AppDispatch, RootState } from '.';

export default function ModelsLoader({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  const settings = useSelector((state: RootState) => state.global.settings);

  const checkpointsLoading = useSelector(
    (state: RootState) => state.global.checkpoint.loading,
  );
  const lorasLoading = useSelector(
    (state: RootState) => state.global.lora.loading,
  );

  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const load = async () => {
      await dispatch(
        readCheckpoints({ shouldImport: settings.scanModelsOnStart === '1' }),
      );
      await dispatch(
        readLoras({ shouldImport: settings.scanModelsOnStart === '1' }),
      );
      window.ipcHandler.watchImagesFolder();
    };
    load();
  }, [dispatch, settings.scanModelsOnStart]);

  useEffect(() => {
    const cb = (event: IpcRendererEvent, m: string, p: number) => {
      setMsg(m);
      setProgress(p);
    };

    const remove = window.ipcOn.modelsProgress(cb);

    return () => remove();
  }, []);

  if (lorasLoading || checkpointsLoading) {
    return (
      <FullLoader title="Hashing Files" progress={progress} message={msg} />
    );
  }

  return children;
}
