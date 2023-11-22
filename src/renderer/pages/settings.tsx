import { useState } from 'react';
import { motion } from 'framer-motion';
import ConfirmDialog, {
  ConfirmDialogResponse,
} from 'renderer/components/ConfirmDialog';
import {
  createImageTag,
  deleteImageTag,
  editImageTag,
  imagesAtom,
  imagesTagsAtom,
  loadImages,
  loadWatchFolders,
  regenerateThumbnails,
  scanImages,
  watchFoldersAtom,
} from 'renderer/state/images.store';
import TagsTable from 'renderer/components/TagsTable';
import StatusBar from 'renderer/components/StatusBar';
import { FullLoader } from 'renderer/components/FullLoader';
import { Tag } from 'main/ipc/tag';
import {
  checkpointsAtom,
  createModelTag,
  deleteModelTag,
  editModelTag,
  loadModels,
  lorasAtom,
  modelTagsAtom,
} from 'renderer/state/models.store';
import { navbarAtom } from 'renderer/state/navbar.store';
import { settingsAtom } from 'renderer/state/settings.store';
import { useAtom } from 'jotai';
import themes from '../../../themes';

export default function Settings() {
  const [settingsState, setSettingsState] = useAtom(settingsAtom);
  const [checkpointsState] = useAtom(checkpointsAtom);
  const [lorasState] = useAtom(lorasAtom);
  const [watchFolders] = useAtom(watchFoldersAtom);
  const [, setNavbarState] = useAtom(navbarAtom);
  const [tags] = useAtom(imagesTagsAtom);
  const [mtags] = useAtom(modelTagsAtom);
  const [imagesState] = useAtom(imagesAtom);

  const [confirmIsOpen, setConfirmIsOpen] = useState<boolean>(false);
  const [confirmMessage, setConfirmMessage] = useState<string>('');
  const [confirmDialogResponse, setConfirmDialogResponse] =
    useState<ConfirmDialogResponse>({ type: '', value: '' });
  const [loading, setLoading] = useState<{ loading: boolean; title: string }>({
    loading: false,
    title: '',
  });

  const onSelectCheckpointsDir = async () => {
    const path = await window.ipcHandler.selectDir();
    settingsState.checkpointsPath = path;
    await loadModels(true, 'checkpoint');
  };

  const onSelectLorasDir = async () => {
    const path = await window.ipcHandler.selectDir();
    settingsState.checkpointsPath = path;
    await loadModels(true, 'lora');
  };

  const onSelectImagesDir = async () => {
    const path = await window.ipcHandler.selectDir();
    if (path) {
      await window.ipcHandler.watchFolder('add', path);
      await window.ipcHandler.watchImagesFolder();
      await loadWatchFolders();
      await scanImages([path]);
      await loadImages();
    }
  };

  const updateImagesDb = async () => {
    await scanImages(watchFolders.map((wf) => wf.path));
    await loadImages();
  };

  const onRegenerateThumbnails = async () => {
    setLoading({
      loading: true,
      title: 'Regenerating thumbnails...',
    });
    await regenerateThumbnails();
    setLoading({
      loading: false,
      title: '',
    });
  };

  const onScanModelsOnStart = async (value: boolean) => {
    setSettingsState((draft) => {
      draft.scanModelsOnStart = value ? '1' : '0';
    });
    await window.ipcHandler.settings(
      'save',
      'scanModelsOnStart',
      value ? '1' : '0',
    );
  };

  const onScanImagesOnStart = async (value: boolean) => {
    setSettingsState((draft) => {
      draft.scanImagesOnStart = value ? '1' : '0';
    });
    await window.ipcHandler.settings(
      'save',
      'scanImagesOnStart',
      value ? '1' : '0',
    );
  };

  const onAutoImportImages = async (value: boolean) => {
    setSettingsState((draft) => {
      draft.autoImportImages = value ? '1' : '0';
    });
    await window.ipcHandler.settings(
      'save',
      'autoImportImages',
      value ? '1' : '0',
    );
  };

  const onAutoTagImportImages = async (value: boolean) => {
    setSettingsState((draft) => {
      draft.autoTagImportImages = value ? '1' : '0';
    });
    await window.ipcHandler.settings(
      'save',
      'autoTagImportImages',
      value ? '1' : '0',
    );
  };

  const changeTheme = async (theme: string) => {
    window.document.documentElement.setAttribute('data-theme', theme);
    setSettingsState((draft) => {
      draft.theme = theme;
    });
    await window.ipcHandler.settings('save', 'theme', theme);
  };

  const confirmRemoveWatchFolder = (watchFolder: string) => {
    setConfirmDialogResponse({ type: 'watchFolder', value: watchFolder });
    setConfirmMessage(
      'This will remove the images from the database, Do you want to proceed ?',
    );
    setConfirmIsOpen(true);
  };

  const removeWatchFolder = async (
    watchFolder: string,
    removeImages: boolean,
  ) => {
    setLoading({ loading: true, title: 'Removing records from database...' });
    setNavbarState((draft) => {
      draft.disabled = true;
    });
    await window.ipcHandler.watchFolder('delete', {
      path: watchFolder,
      removeImages,
    });
    await loadWatchFolders();
    window.ipcHandler.watchImagesFolder();
    await loadImages();
    setLoading({ loading: false, title: '' });
    setNavbarState((draft) => {
      draft.disabled = false;
    });
  };

  const onConfirmClose = () => {
    setConfirmIsOpen(false);
    setConfirmMessage('');
    setConfirmDialogResponse({ type: '', value: '' });
  };

  const onConfirmDialog = async (response: ConfirmDialogResponse) => {
    if (response.type === 'watchFolder') {
      await removeWatchFolder(response.value, true);
    }

    if (response.type === 'deleteTag') {
      await deleteImageTag(response.value);
      await loadImages();
    }

    if (response.type === 'deleteMTag') {
      await deleteModelTag(response.value);
      await loadModels(false, 'lora');
      await loadModels(false, 'checkpoint');
    }

    setConfirmIsOpen(false);
    setConfirmDialogResponse({ type: '', value: '' });
  };

  const editWatchFolder = async (watchFolder: string) => {
    const path = await window.ipcHandler.selectDir();

    if (path) {
      setNavbarState((draft) => {
        draft.disabled = true;
      });
      setLoading({ loading: true, title: 'Updating records in database...' });
      await window.ipcHandler.watchFolder('edit', {
        currentPath: watchFolder,
        newPath: path,
      });
      window.ipcHandler.watchImagesFolder();
      await loadImages();
      setLoading({ loading: false, title: '' });
      setNavbarState((draft) => {
        draft.disabled = false;
      });
    }
  };

  const scanModels = async (type: 'checkpoint' | 'lora') => {
    await loadModels(true, type);
  };

  const confirmDeleteTag = async (tag: Tag) => {
    setConfirmDialogResponse({ type: 'deleteTag', value: tag.id });
    setConfirmMessage(
      `Are you sure? Deleting a tag will remove it from all images`,
    );
    setConfirmIsOpen(true);
  };

  const confirmDeleteMTag = async (tag: Tag) => {
    setConfirmDialogResponse({ type: 'deleteMTag', value: tag.id });
    setConfirmMessage(
      `Are you sure? Deleting a tag will remove it from all models (loras and checkpoints)`,
    );
    setConfirmIsOpen(true);
  };

  const updateTag = async ({
    id,
    label,
    bgColor,
  }: {
    id: string;
    label: string;
    bgColor: string;
  }) => {
    await editImageTag(id, label, bgColor);
  };

  const addTag = async ({
    label,
    bgColor,
  }: {
    label: string;
    bgColor: string;
  }) => {
    await createImageTag(label, bgColor);
  };

  const updateMTag = async ({
    id,
    label,
    bgColor,
  }: {
    id: string;
    label: string;
    bgColor: string;
  }) => {
    await editModelTag(id, label, bgColor);
  };

  const addMTag = async ({
    label,
    bgColor,
  }: {
    label: string;
    bgColor: string;
  }) => {
    await createModelTag(label, bgColor);
  };

  if (loading.loading) {
    return <FullLoader title="Loading..." />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-full"
    >
      <ConfirmDialog
        response={confirmDialogResponse}
        isOpen={confirmIsOpen}
        msg={confirmMessage}
        onClose={onConfirmClose}
        onConfirm={onConfirmDialog}
      />
      <section className="pt-10 pb-20 px-10 2xl:w-2/3 lg:w-full md:w-full h-full overflow-y-auto">
        <div>
          <p className="text-2xl">Settings</p>
        </div>
        <div className="mt-3 flex flex-row items-center">
          <div className="w-2/3">
            <p>
              <span>Checkpoints folder:</span> {settingsState.checkpointsPath}{' '}
            </p>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => onSelectCheckpointsDir()}
            >
              Change
            </button>
            <button
              type="button"
              className="btn btn-sm ml-2"
              disabled={checkpointsState.loading}
              onClick={() => scanModels('checkpoint')}
            >
              {checkpointsState.loading && (
                <span className="loading loading-spinner" />
              )}
              {checkpointsState.loading ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-row items-center">
          <div className="w-2/3">
            <p>
              <span>Loras folder:</span> {settingsState.lorasPath}{' '}
            </p>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => onSelectLorasDir()}
            >
              Change
            </button>
            <button
              type="button"
              className="btn btn-sm ml-2"
              disabled={lorasState.loading}
              onClick={() => scanModels('lora')}
            >
              {lorasState.loading && (
                <span className="loading loading-spinner" />
              )}
              {lorasState.loading ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-row items-center form-control">
          <label
            className="label cursor-pointer ml-0 pl-0 w-full justify-start"
            htmlFor="scanModelsOnStart"
          >
            <span className="label-text text-base w-2/3">
              Import new models on start
            </span>
            <input
              id="scanModelsOnStart"
              type="checkbox"
              checked={settingsState.scanModelsOnStart === '1'}
              onChange={(e) => onScanModelsOnStart(e.target.checked)}
              className="checkbox checkbox-primary"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-row items-center form-control">
          <label
            className="label cursor-pointer ml-0 pl-0 w-full justify-start"
            htmlFor="scanImagesOnStart"
          >
            <span className="label-text text-base w-2/3">
              Import new images on start
            </span>
            <input
              id="scanImagesOnStart"
              type="checkbox"
              checked={settingsState.scanImagesOnStart === '1'}
              onChange={(e) => onScanImagesOnStart(e.target.checked)}
              className="checkbox checkbox-primary"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-row items-center form-control">
          <label
            className="label cursor-pointer ml-0 pl-0 w-full justify-start"
            htmlFor="autoImportImages"
          >
            <span className="label-text text-base w-2/3">
              Auto import images
            </span>
            <input
              id="autoImportImages"
              type="checkbox"
              checked={settingsState.autoImportImages === '1'}
              onChange={(e) => onAutoImportImages(e.target.checked)}
              className="checkbox checkbox-primary"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-row items-center form-control">
          <label
            className="label cursor-pointer ml-0 pl-0 w-full justify-start"
            htmlFor="autoTagImportImages"
          >
            <span className="label-text text-base w-2/3">
              Auto tag import images
            </span>
            <input
              id="autoTagImportImages"
              type="checkbox"
              checked={settingsState.autoTagImportImages === '1'}
              onChange={(e) => onAutoTagImportImages(e.target.checked)}
              className="checkbox checkbox-primary"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-row items-center">
          <div className="w-2/3">
            <p>Change theme</p>
          </div>
          <select
            className="select select-bordered w-1/3"
            onChange={(e) => changeTheme(e.target.value)}
            value={settingsState.theme || 'default'}
          >
            <option value="default">Default</option>
            {themes.map((theme) => {
              return (
                <option
                  key={theme}
                  value={theme}
                >{`${theme[0].toUpperCase()}${theme.slice(1)}`}</option>
              );
            })}
          </select>
        </div>
        <div className="divider" />
        <div className="mt-5 flex flex-row justify-between">
          <p className="text-2xl">Folders to watch images</p>
        </div>
        <div className="my-6 flex justify-between">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => onSelectImagesDir()}
          >
            Pick a folder to watch
          </button>
          <div className="flex flex-ro">
            <button
              type="button"
              className="btn btn-sm mr-2"
              onClick={() => onRegenerateThumbnails()}
            >
              Regenerate thumbnails
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => updateImagesDb()}
            >
              Update images database
            </button>
          </div>
        </div>
        <div className="">
          <table className="table">
            <thead>
              <tr>
                <th className="w-2/3">Path</th>
                <th className="w-1/3"> </th>
              </tr>
            </thead>
            <tbody>
              {watchFolders.map((watchFolder) => {
                return (
                  <tr key={`setting_watchfolder_${watchFolder.path}`}>
                    <td>
                      <div className="flex flex-row items-center justify-between">
                        <p>{watchFolder.path}</p>
                      </div>
                    </td>
                    <td className="flex justify-end">
                      <div className="flex flex-row">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-6 h-6 cursor-pointer mx-2"
                          onClick={() => editWatchFolder(watchFolder.path)}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                          />
                        </svg>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-6 h-6 text-red-500 cursor-pointer mx-2"
                          onClick={() =>
                            confirmRemoveWatchFolder(watchFolder.path)
                          }
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="divider" />
        <div className="">
          <TagsTable
            tags={Object.values(tags)}
            updateTag={updateTag}
            deleteTag={confirmDeleteTag}
            addTag={addTag}
            title="Images tags"
          />
        </div>
        <div className="divider" />
        <div className="">
          <TagsTable
            tags={Object.values(mtags)}
            updateTag={updateMTag}
            deleteTag={confirmDeleteMTag}
            addTag={addMTag}
            title="Models tags"
          />
        </div>
      </section>
      <div className="absolute bottom-0 left-0 w-full">
        <StatusBar
          checkpointsImportProgress={checkpointsState.importProgress}
          lorasImportProgress={lorasState.importProgress}
          imagesImportProgress={imagesState.importProgress}
        />
      </div>
    </motion.div>
  );
}
