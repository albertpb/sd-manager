import { IpcRendererEvent } from 'electron';
import { ReactNode, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  checkpointsImportProgress,
  lorasImportProgress,
} from '../signals/models';
import { loadMTags, readCheckpoints, readLoras } from './reducers/global';
import { AppDispatch, RootState } from '.';

export default function ModelsLoader({ children }: { children: ReactNode }) {
  const settings = useSelector((state: RootState) => state.global.settings);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const load = async () => {
      await dispatch(
        readCheckpoints({ shouldImport: settings.scanModelsOnStart === '1' }),
      );
      await dispatch(
        readLoras({ shouldImport: settings.scanModelsOnStart === '1' }),
      );
      await dispatch(loadMTags());
      window.ipcHandler.watchImagesFolder();
    };
    load();
    // eslint-disable-next-line
  }, [dispatch]);

  useEffect(() => {
    const cb = (event: IpcRendererEvent, m: string, p: number, t: string) => {
      if (t === 'lora') {
        lorasImportProgress.value = {
          progress: p,
          message: m,
        };
      }
      if (t === 'checkpoint') {
        checkpointsImportProgress.value = {
          progress: p,
          message: m,
        };
      }
    };

    const remove = window.ipcOn.modelsProgress(cb);

    return () => remove();
  }, []);

  return children;
}
