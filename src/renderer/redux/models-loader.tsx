import { ReactNode, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { init, readCheckpointsDir } from './reducers/global';
import { AppDispatch, RootState } from '.';

export default function ModelsLoader({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const checkpointsLoading = useSelector(
    (state: RootState) => state.global.checkpointsLoading
  );
  const initialized = useSelector(
    (state: RootState) => state.global.initialized
  );

  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (!initialized) {
      dispatch(readCheckpointsDir());
      dispatch(init());
    }
  }, [dispatch, initialized]);

  useEffect(() => {
    window.ipcOn.modelsProgress((event, m, p) => {
      setMsg(m);
      setProgress(p);
    });
  }, [msg, progress]);

  if (!checkpointsLoading) return children;

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
