import { IpcRendererEvent } from 'electron';
import { ImageRow } from 'main/ipc/image';
import { ReactNode, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { WatchFolder } from 'main/ipc/watchFolders';
import { imagesImportProgress } from 'renderer/signals/images';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '.';
import {
  loadTags,
  loadWatchFolders,
  readImages,
  scanImages,
  setImages,
} from './reducers/global';

export default function ImagesLoader({ children }: { children: ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

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
      const wfs: WatchFolder[] = await window.ipcHandler.watchFolder('read');
      if (scanImagesOnStart === '1') {
        await dispatch(scanImages(wfs.map((f) => f.path)));
      }
      if (wfs.length > 0) {
        await dispatch(readImages());
      } else {
        navigate('/settings');
      }
    };
    load();
  }, [dispatch, navigate, scanImagesOnStart]);

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
