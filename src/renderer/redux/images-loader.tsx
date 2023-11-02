import { IpcRendererEvent } from 'electron';
import { ImageRow } from 'main/ipc/image';
import { ReactNode, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FullLoader } from 'renderer/components/FullLoader';
import { AppDispatch, RootState } from '.';
import { readImages, scanImages, setImages } from './reducers/global';

export default function ImagesLoader({ children }: { children: ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();

  const [msg, setMsg] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const imagesLoading = useSelector(
    (state: RootState) => state.global.imagesLoading,
  );

  const images = useSelector((state: RootState) => state.global.images);

  useEffect(() => {
    const load = async () => {
      const watchFolders: { path: string }[] =
        await window.ipcHandler.watchFolder('read');
      await dispatch(scanImages(watchFolders.map((f) => f.path)));
      await dispatch(readImages());
    };

    load();
  }, [dispatch]);

  useEffect(() => {
    const cb = (event: IpcRendererEvent, m: string, p: number) => {
      setMsg(m);
      setProgress(p);
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

  if (!imagesLoading) return children;

  return (
    <FullLoader title="Importing images" progress={progress} message={msg} />
  );
}
