import { IpcRendererEvent } from 'electron';
import { ImageRow } from 'main/ipc/image';
import { ReactNode, useEffect } from 'react';
import { WatchFolder } from 'main/ipc/watchFolders';
import { useNavigate } from 'react-router-dom';
import {
  imagesAtom,
  loadImages,
  loadImagesTags,
  loadWatchFolders,
  scanImages,
} from 'renderer/state/images.store';
import { useAtom } from 'jotai';
import { settingsAtom } from 'renderer/state/settings.store';

export default function ImagesLoader({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const [settingsState] = useAtom(settingsAtom);
  const [, setImagesState] = useAtom(imagesAtom);

  useEffect(() => {
    const load = async () => {
      await loadWatchFolders();
      await loadImagesTags();
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      const wfs: WatchFolder[] = await window.ipcHandler.watchFolder('read');
      if (settingsState.scanImagesOnStart === '1') {
        await scanImages(wfs.map((f) => f.path));
      }
      if (wfs.length > 0) {
        await loadImages();
      } else {
        navigate('/settings');
      }
    };
    load();
  }, [navigate, settingsState]);

  useEffect(() => {
    const cb = (event: IpcRendererEvent, m: string, p: number) => {
      setImagesState((draft) => {
        draft.importProgress = {
          progress: p,
          message: m,
        };
      });
    };
    const remove = window.ipcOn.imagesProgress(cb);

    return () => remove();
  }, [setImagesState]);

  useEffect(() => {
    const cb = (event: IpcRendererEvent, imagesData: ImageRow) => {
      setImagesState((draft) => {
        draft.images = [imagesData, ...draft.images];
      });
    };

    const remove = window.ipcOn.detectedAddImage(cb);

    return () => remove();
  }, [setImagesState]);

  return children;
}
