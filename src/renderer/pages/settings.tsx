import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { AppDispatch, RootState } from 'renderer/redux';
import {
  setCheckpointsPath,
  setLorasPath,
  setScanModelsOnStart,
  setTheme,
  readImages,
  scanImages,
  setNavbarDisabled,
  readLoras,
  readCheckpoints,
  loadWatchFolders,
  deleteTag,
  editTag,
  createTag,
  setScanImagesOnStart,
  setAutoImportImages,
  regenerateThumbnails,
} from 'renderer/redux/reducers/global';
import ConfirmDialog, {
  ConfirmDialogResponse,
} from 'renderer/components/ConfirmDialog';
import { getTextColorFromBackgroundColor } from 'renderer/utils';
import ColorPicker from 'renderer/components/ColorPicker';
import { FullLoader } from 'renderer/components/FullLoader';
import { Tag } from 'main/ipc/tag';
import themes from '../../../themes';

export default function Settings() {
  const dispatch = useDispatch<AppDispatch>();

  const settings = useSelector((state: RootState) => state.global.settings);
  const watchFolders = useSelector(
    (state: RootState) => state.global.watchFolders,
  );
  const tags = useSelector((state: RootState) => state.global.tags);
  const [tagsEditState, setTagsEditState] = useState<
    Record<string, { show: boolean; inputValue: string; bgColor: string }>
  >({});
  const [addTagLabel, setAddTagLabel] = useState<string>('');

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
    dispatch(setCheckpointsPath(path as string));
    await dispatch(readCheckpoints({ shouldImport: true }));
  };

  const onSelectLorasDir = async () => {
    const path = await window.ipcHandler.selectDir();
    dispatch(setLorasPath(path as string));
    await dispatch(readLoras({ shouldImport: true }));
  };

  const onSelectImagesDir = async () => {
    const path = await window.ipcHandler.selectDir();
    if (path) {
      await window.ipcHandler.watchFolder('add', path);
      await window.ipcHandler.watchImagesFolder();
      await dispatch(loadWatchFolders());
      await dispatch(scanImages([path]));
      await dispatch(readImages());
    }
  };

  const updateImagesDb = async () => {
    await dispatch(scanImages(watchFolders.map((wf) => wf.path)));
    await dispatch(readImages());
  };

  const onRegenerateThumbnails = async () => {
    setLoading({
      loading: true,
      title: 'Regenerating thumbnails...',
    });
    await dispatch(regenerateThumbnails());
    setLoading({
      loading: false,
      title: '',
    });
  };

  const onScanModelsOnStart = async (value: boolean) => {
    dispatch(setScanModelsOnStart(value ? '1' : '0'));
  };

  const onScanImagesOnStart = async (value: boolean) => {
    dispatch(setScanImagesOnStart(value ? '1' : '0'));
  };

  const onAutoImportImages = async (value: boolean) => {
    dispatch(setAutoImportImages(value ? '1' : '0'));
  };

  const changeTheme = async (theme: string) => {
    window.document.documentElement.setAttribute('data-theme', theme);
    await dispatch(setTheme(theme));
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
    dispatch(setNavbarDisabled(true));
    await window.ipcHandler.watchFolder('delete', {
      path: watchFolder,
      removeImages,
    });
    await dispatch(loadWatchFolders());
    window.ipcHandler.watchImagesFolder();
    await dispatch(readImages());
    setLoading({ loading: false, title: '' });
    dispatch(setNavbarDisabled(false));
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
      await dispatch(deleteTag(response.value));
      await dispatch(readImages());
    }

    setConfirmIsOpen(false);
    setConfirmDialogResponse({ type: '', value: '' });
  };

  const editWatchFolder = async (watchFolder: string) => {
    const path = await window.ipcHandler.selectDir();

    if (path) {
      dispatch(setNavbarDisabled(true));
      setLoading({ loading: true, title: 'Updating records in database...' });
      await window.ipcHandler.watchFolder('edit', {
        currentPath: watchFolder,
        newPath: path,
      });
      window.ipcHandler.watchImagesFolder();
      dispatch(readImages());
      setLoading({ loading: false, title: '' });
      dispatch(setNavbarDisabled(false));
    }
  };

  const scanModels = async (type: 'checkpoint' | 'lora') => {
    if (type === 'checkpoint') {
      await dispatch(readCheckpoints({ shouldImport: true }));
    }
    if (type === 'lora') {
      await dispatch(readLoras({ shouldImport: true }));
    }
  };

  const confirmDeleteTag = async (tag: Tag) => {
    setConfirmDialogResponse({ type: 'deleteTag', value: tag.id });
    setConfirmMessage(
      `Are you sure? Deleting a tag will remove it from all images`,
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
    await dispatch(editTag({ id, label, bgColor }));
    setTagsEditState({
      ...tagsEditState,
      [id]: { inputValue: '', show: false, bgColor: '#269310' },
    });
  };

  const addTag = async () => {
    await dispatch(createTag({ label: addTagLabel, bgColor: '#269310	' }));
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
              <span>Checkpoints folder:</span> {settings.checkpointsPath}{' '}
            </p>
          </div>
          <div className="flex flex-row">
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
              onClick={() => scanModels('checkpoint')}
            >
              Scan
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-row items-center">
          <div className="w-2/3">
            <p>
              <span>Loras folder:</span> {settings.lorasPath}{' '}
            </p>
          </div>
          <div className="flex">
            <div className="mr-2">
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
                onClick={() => scanModels('lora')}
              >
                Scan
              </button>
            </div>
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
              checked={settings.scanModelsOnStart === '1'}
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
              checked={settings.scanImagesOnStart === '1'}
              onChange={(e) => onScanImagesOnStart(e.target.checked)}
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
              Auto import images
            </span>
            <input
              id="scanImagesOnStart"
              type="checkbox"
              checked={settings.autoImportImages === '1'}
              onChange={(e) => onAutoImportImages(e.target.checked)}
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
            value={settings.theme || 'default'}
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
              regenerate thumbnails
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => updateImagesDb()}
            >
              update images database
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
          <div className="mt-5 flex flex-row justify-between">
            <p className="text-2xl">Tags</p>
          </div>
          <div className="flex flex-row my-4 w-full">
            <input
              value={addTagLabel}
              onChange={(e) => setAddTagLabel(e.target.value)}
              type="text"
              placeholder="Type tag label"
              className="input input-bordered input-secondary input-sm w-full"
              onKeyUp={(e) => (e.key === 'Enter' ? addTag() : null)}
            />
            <button
              type="button"
              className="btn btn-sm ml-2"
              onClick={() => addTag()}
            >
              Add
            </button>
          </div>
          <div className="mt-2">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-full">Tag</th>
                  <th className="w-1/3"> </th>
                </tr>
              </thead>
              <tbody>
                {tags.map((tag) => (
                  <tr key={`tags-${tag.id}`}>
                    <td>
                      {tagsEditState[tag.id]?.show ? (
                        <div className="flex flex-row items-center">
                          <input
                            value={tagsEditState[tag.id].inputValue}
                            onChange={(e) =>
                              setTagsEditState({
                                ...tagsEditState,
                                [tag.id]: {
                                  ...tagsEditState[tag.id],
                                  inputValue: e.target.value,
                                },
                              })
                            }
                            onKeyUp={(e) =>
                              e.key === 'Enter'
                                ? updateTag({
                                    id: tag.id,
                                    label: tagsEditState[tag.id].inputValue,
                                    bgColor: tagsEditState[tag.id].bgColor,
                                  })
                                : null
                            }
                            type="text"
                            placeholder="Type here"
                            className="input input-bordered input-sm w-full"
                          />
                          <ColorPicker
                            className="ml-4"
                            color={tagsEditState[tag.id].bgColor}
                            onChange={(color) =>
                              setTagsEditState({
                                ...tagsEditState,
                                [tag.id]: {
                                  ...tagsEditState[tag.id],
                                  bgColor: color,
                                },
                              })
                            }
                          />
                          <div
                            className="badge ml-4"
                            style={{
                              color: getTextColorFromBackgroundColor(
                                tagsEditState[tag.id].bgColor,
                              ),
                              background: tagsEditState[tag.id].bgColor,
                            }}
                          >
                            {tagsEditState[tag.id].inputValue}
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm ml-4"
                            onClick={() =>
                              updateTag({
                                id: tag.id,
                                label: tagsEditState[tag.id].inputValue,
                                bgColor: tagsEditState[tag.id].bgColor,
                              })
                            }
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        tag.label
                      )}
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
                          onClick={() => {
                            setTagsEditState({
                              ...tagsEditState,
                              [tag.id]:
                                tagsEditState[tag.id] === undefined
                                  ? {
                                      inputValue: tag.label,
                                      bgColor: tag.bgColor,
                                      show: true,
                                    }
                                  : {
                                      ...tagsEditState[tag.id],
                                      show: !tagsEditState[tag.id].show,
                                    },
                            });
                          }}
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
                          onClick={() => confirmDeleteTag(tag)}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
