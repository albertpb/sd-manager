import { IpcRendererEvent } from 'electron';
import { ImageRow } from 'main/ipc/image';
import { ReactNode, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '.';
import { readImages, setImages } from './reducers/global';

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
    <div className="w-full flex flex-col justify-center items-center h-screen">
      <div className="stats">
        <div className="stat place-items-center">
          <div className="stat-title">Parsing images metadata</div>
          <div className="stat-value">{progress.toFixed(2)}%</div>
          <div className="stat-desc">{msg}</div>
        </div>
      </div>
      <progress className="progress w-56" value={progress} max="100" />
    </div>
  );
}
