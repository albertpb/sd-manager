import { IpcRendererEvent } from 'electron';
import { ImageRow } from 'main/ipc/image';
import { ReactNode, useEffect } from 'react';
import { signal } from '@preact/signals-react';
import { useDispatch, useSelector } from 'react-redux';
import { WatchFolder } from 'main/ipc/watchFolders';
import { AppDispatch, RootState } from '.';
import {
  loadTags,
  loadWatchFolders,
  readImages,
  scanImages,
  setImages,
} from './reducers/global';

export const imagesImportProgress = signal<{
  progress: number;
  message: string;
}>({
  progress: 0,
  message: '',
});

export default function ImagesLoader({ children }: { children: ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();

  const images = useSelector((state: RootState) => state.global.images);
  const scanImagesOnStart = useSelector(
    (state: RootState) => state.global.settings.scanImagesOnStart,
  );

  useEffect(() => {
    const load = async () => {
      await dispatch(loadWatchFolders());
      await dispatch(loadTags());
    };
    load();
  }, [dispatch]);

  useEffect(() => {
    const load = async () => {
      if (scanImagesOnStart === '1') {
        const watchFolders: WatchFolder[] =
          await window.ipcHandler.watchFolder('read');
        await dispatch(scanImages(watchFolders.map((f) => f.path)));
      }
      await dispatch(readImages());
    };
    load();
  }, [dispatch, scanImagesOnStart]);

  useEffect(() => {
    const cb = (event: IpcRendererEvent, m: string, p: number) => {
      imagesImportProgress.value = {
        progress: p,
        message: m,
      };
    };
    const remove = window.ipcOn.imagesProgress(cb);

    return () => remove();
  }, []);

  useEffect(() => {
    const cb = (event: IpcRendererEvent, imagesData: ImageRow) => {
      dispatch(setImages([imagesData, ...images]));
    };

    const remove = window.ipcOn.detectedAddImage(cb);

    return () => remove();
  }, [images, dispatch]);

  return children;
}
