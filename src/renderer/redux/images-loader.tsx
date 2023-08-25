import { IpcRendererEvent } from 'electron';
import { ReactNode, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '.';

export default function ImagesLoader({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const imagesLoading = useSelector(
    (state: RootState) => state.global.imagesLoading
  );

  useEffect(() => {
    const listener = (event: IpcRendererEvent, m: string, p: number) => {
      setMsg(m);
      setProgress(p);
    };
    window.ipcOn.imagesProgress(listener);
  }, [msg, progress]);

  if (!imagesLoading) return children;

  return (
    <div className="w-full flex flex-col justify-center items-center h-screen">
      <div className="stats">
        <div className="stat place-items-center">
          <div className="stat-title">Getting images</div>
          <div className="stat-value">{progress.toFixed(2)}%</div>
          <div className="stat-desc">{msg}</div>
        </div>
      </div>
      <progress className="progress w-56" value={progress} max="100" />
    </div>
  );
}
