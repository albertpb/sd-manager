import { IpcRendererEvent } from 'electron';
import { signal } from '@preact/signals-react';
import { ReactNode, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadMTags, readCheckpoints, readLoras } from './reducers/global';
import { AppDispatch, RootState } from '.';

export const modelsImportProgress = signal<{
  progress: number;
  message: string;
}>({
  progress: 0,
  message: '',
});

export default function ModelsLoader({ children }: { children: ReactNode }) {
  const settings = useSelector((state: RootState) => state.global.settings);
  const loading = useSelector(
    (state: RootState) =>
      state.global.checkpoint.loading || state.global.lora.loading,
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
      await dispatch(loadMTags());
      window.ipcHandler.watchImagesFolder();
    };
    load();
    // eslint-disable-next-line
  }, [dispatch]);

  useEffect(() => {
    const cb = (event: IpcRendererEvent, m: string, p: number) => {
      modelsImportProgress.value = {
        progress: p,
        message: m,
      };
    };

    const remove = window.ipcOn.modelsProgress(cb);

    return () => remove();
  }, []);

  return loading ? null : children;
}
