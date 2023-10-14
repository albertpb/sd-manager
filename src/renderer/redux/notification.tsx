import { IpcRendererEvent } from 'electron';
import { ImageRow } from 'main/ipc/organizeImages';
import { ReactNode, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { RootState } from '.';

export default function Notificator({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const imageLoading = useSelector<RootState>(
    (state) => state.global.imagesLoading
  );

  useEffect(() => {
    const cb = (event: IpcRendererEvent, imageData: ImageRow) => {
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
    };
    window.ipcOn.detectedAddImage(cb);

    return () => window.ipcOn.rmDetectedAddImage(cb);
  }, []);

  useEffect(() => {
    const cb = (event: IpcRendererEvent, msg: string, model: string) => {
      toast(`${msg} ${model}`, {
        closeOnClick: false,
        autoClose: false,
      });
    };

    window.ipcOn.duplicatesDetected(cb);

    return () => window.ipcOn.rmDuplicatesDetected(cb);
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
