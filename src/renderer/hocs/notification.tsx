import { IpcRendererEvent } from 'electron';
import { ImageRow } from 'main/ipc/image';
import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';

export default function Notificator({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    const cb = (event: IpcRendererEvent, imageData: ImageRow) => {
      toast(`File detected ${imageData.model} - ${imageData.sourcePath}`, {
        onClick: () => navigate(`/image-detail/${imageData.hash}`),
        closeOnClick: true,
        autoClose: 5000,
      });
    };
    const remove = window.ipcOn.detectedAddImage(cb);

    return () => remove();
  }, [navigate]);

  useEffect(() => {
    const cb = (event: IpcRendererEvent, msg: string, model: string) => {
      toast(`${msg} ${model}`, {
        closeOnClick: true,
        autoClose: 5000,
        pauseOnHover: true,
      });
    };

    const remove = window.ipcOn.duplicatesDetected(cb);

    return () => remove();
  }, []);

  return (
    <>
      <ToastContainer
        position="bottom-right"
        pauseOnFocusLoss
        pauseOnHover
        theme="dark"
      />
      {children}
    </>
  );
}
