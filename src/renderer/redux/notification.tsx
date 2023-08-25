import { IpcRendererEvent } from 'electron';
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
  const [lastImage, setLastImage] = useState<string>();

  useEffect(() => {
    const listener = (
      event: IpcRendererEvent,
      model: string,
      filePath: string
    ) => {
      if (!imageLoading) {
        console.log('notify');
        const baseName = filePath.split('\\').pop()?.split('/').pop();
        toast(`File detected ${model} - ${filePath}`, {
          onClick: () => navigate(`/image-detail/${model}/${baseName}`),
          closeOnClick: true,
        });
        setLastImage(baseName);
      }
    };
    window.ipcOn.detectedAddImage(listener);
  }, [imageLoading, lastImage]);

  if (imageLoading) return children;

  return (
    <>
      <ToastContainer
        position="bottom-right"
        pauseOnFocusLoss
        pauseOnHover
        theme="dark"
        autoClose={false}
      />
      {children}
    </>
  );
}
