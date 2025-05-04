import { IpcRendererEvent } from 'electron';
import { useAtom } from 'jotai';
import { ModelType } from 'main/ipc/model';
import { ReactNode, useEffect } from 'react';
import {
  checkpointsAtom,
  loadModels,
  loadModelsTags,
  lorasAtom,
} from 'renderer/state/models.store';
import { settingsAtom } from 'renderer/state/settings.store';

export default function ModelsLoader({ children }: { children: ReactNode }) {
  const [settingsState] = useAtom(settingsAtom);
  const [, setLorasState] = useAtom(lorasAtom);
  const [, setCheckpointsState] = useAtom(checkpointsAtom);

  useEffect(() => {
    const load = async () => {
      await loadModels(settingsState.scanModelsOnStart === '1', 'checkpoint');
      await loadModels(settingsState.scanModelsOnStart === '1', 'lora');
      await loadModelsTags();
      window.ipcHandler.watchImagesFolder();
    };
    load();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const cb = (
      event: IpcRendererEvent,
      m: string,
      p: number,
      t: ModelType,
    ) => {
      if (t === 'lora') {
        setLorasState((draft) => {
          draft.importProgress = {
            progress: p,
            message: m,
          };
        });
      }
      if (t === 'checkpoint') {
        setCheckpointsState((draft) => {
          draft.importProgress = {
            progress: p,
            message: m,
          };
        });
      }
    };

    const remove = window.ipcOn.modelsProgress(cb);

    return () => remove();
  }, [setCheckpointsState, setLorasState]);

  return children;
}
