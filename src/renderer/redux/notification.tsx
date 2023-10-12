import { IpcRendererEvent } from 'electron';
import { ImageRow } from 'main/ipc/organizeImages';
import { ReactNode, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { RootState } from '.';

export default function Notificator({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const imageLoading = useSelector<RootState>(
    (state) => state.global.imagesLoading
  );
  const [listenerPending, setListenerPending] = useState<boolean>();

  useEffect(() => {
    const listener = (event: IpcRendererEvent, imageData: ImageRow) => {
      if (!imageLoading) {
        toast(
          `File detected ${imageData.model} - ${imageData.path}\\${imageData.fileName}`,
          {
            onClick: () => navigate(`/image-detail/${imageData.hash}`),
            closeOnClick: true,
            autoClose: 5000,
          }
        );
      }
      setListenerPending(false);
    };
    if (!listenerPending) {
      window.ipcOn.detectedAddImage(listener);
      setListenerPending(true);
    }

    return () => window.ipcOn.rmDetectedAddImage(listener);

    /* eslint-disable-next-line */
  }, [imageLoading, listenerPending]);

  useEffect(() => {
    const listener = (event: IpcRendererEvent, msg: string, model: string) => {
      toast(`${msg} ${model}`, {
        closeOnClick: false,
        autoClose: false,
      });
    };

    window.ipcOn.duplicatesDetected(listener);
  }, []);

  if (imageLoading) return children;

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
