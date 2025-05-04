import { atomWithImmer } from 'jotai-immer';
import { store } from './index';

export type SettingsState = {
  scanModelsOnStart: string | null;
  scanImagesOnStart: string | null;
  checkpointsPath: string | null;
  lorasPath: string | null;
  theme: string | null;
  activeTags: string | null;
  activeMTags: string | null;
  autoImportImages: string | null;
  autoImportTags: string | null;
  autoTagImportImages: string | null;
};

export const settingsAtom = atomWithImmer<SettingsState>({
  scanModelsOnStart: '0',
  scanImagesOnStart: '0',
  checkpointsPath: null,
  lorasPath: null,
  theme: 'default',
  activeTags: null,
  activeMTags: null,
  autoImportImages: '0',
  autoImportTags: null,
  autoTagImportImages: null,
});
settingsAtom.debugLabel = 'settingsAtom';

export const loadSettings = async () => {
  const settings = await window.ipcHandler.settings('readAll');
  store.set(settingsAtom, () => {
    return settings;
  });
};
