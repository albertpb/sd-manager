import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
} from 'renderer/redux/reducers/global';
import ConfirmDialog from 'renderer/components/ConfirmDialog';
import { FullLoader } from 'renderer/components/FullLoader';
import themes from '../../../themes';

export default function Settings() {
  const { settings } = useSelector((state: RootState) => state.global);
  const dispatch = useDispatch<AppDispatch>();

  const [watchFolders, setWatchFolders] = useState<string[]>([]);
  const [confirmIsOpen, setConfirmIsOpen] = useState<boolean>(false);
  const [confirmMessage, setConfirmMessage] = useState<string>('');
  const [confirmDialogId, setConfirmDialogId] = useState<string>('');
  const [loading, setLoading] = useState<{ loading: boolean; title: string }>({
    loading: false,
    title: '',
  });

  const onSelectCheckpointsDir = async () => {
    const path = await window.ipcHandler.selectDir();
    await dispatch(setCheckpointsPath(path as string));
    await readCheckpoints({ shouldImport: true });
  };

  const onSelectLorasDir = async () => {
    const path = await window.ipcHandler.selectDir();
    dispatch(setLorasPath(path as string));
    await readLoras({ shouldImport: true });
  };

  const onSelectImagesDir = async () => {
    const path = await window.ipcHandler.selectDir();
    if (path) {
      await window.ipcHandler.watchFolder('add', path);
      await window.ipcHandler.watchImagesFolder();
      setWatchFolders([...watchFolders, path]);
      await dispatch(scanImages([path]));
      await dispatch(readImages());
    }
  };

  const updateImagesDb = async () => {
    await dispatch(scanImages(watchFolders));
    await dispatch(readImages());
  };

  const onScanModelsOnStart = async (value: boolean) => {
    dispatch(setScanModelsOnStart(value ? '1' : '0'));
  };

  const changeTheme = async (theme: string) => {
    window.document.documentElement.setAttribute('data-theme', theme);
    await dispatch(setTheme(theme));
  };

  const confirmRemoveWatchFolder = (watchFolder: string) => {
    setConfirmDialogId(watchFolder);
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
    const arr = [...watchFolders];
    const index = arr.findIndex((folder) => folder === watchFolder);
    if (index !== -1) {
      arr.splice(index, 1);
      setWatchFolders(arr);
    }
    window.ipcHandler.watchImagesFolder();
    dispatch(readImages());
    setLoading({ loading: false, title: '' });
    dispatch(setNavbarDisabled(false));
  };

  const onConfirmClose = () => {
    setConfirmIsOpen(false);
    setConfirmMessage('');
    setConfirmDialogId('');
  };

  const onConfirmDialog = async (id: string) => {
    await removeWatchFolder(id, true);
    setConfirmIsOpen(false);
    setConfirmDialogId('');
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

  useEffect(() => {
    const getFoldersToWatch = async () => {
      const wf: { path: string }[] =
        await window.ipcHandler.watchFolder('read');
      setWatchFolders(wf.map((f) => f.path));
    };
    getFoldersToWatch();
  }, []);

  if (loading.loading) {
    return <FullLoader title="Loading..." />;
  }

  return (
    <>
      <ConfirmDialog
        id={confirmDialogId}
        isOpen={confirmIsOpen}
        msg={confirmMessage}
        onClose={onConfirmClose}
        onConfirm={onConfirmDialog}
      />
      <section className="pt-10 px-10 w-full">
        <div>
          <p className="text-2xl">Settings</p>
        </div>
        <div className="mt-3 flex flex-row items-center w-1/2">
          <div className="w-2/3">
            <p>
              <span>Checkpoints folder:</span> {settings.checkpointsPath}{' '}
            </p>
          </div>
          <div className="">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => onSelectCheckpointsDir()}
            >
              Change
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-row items-center w-1/2">
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
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-row items-center w-1/2 form-control">
          <label
            className="label cursor-pointer ml-0 pl-0 w-full justify-start"
            htmlFor="scanModelsOnStart"
          >
            <span className="label-text text-base w-2/3">
              Scan models on start
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
        <div className="mt-3 flex flex-row items-center w-1/2">
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
        <div className="lg:w-1/2 md:w-full my-6 flex justify-between">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => onSelectImagesDir()}
          >
            Pick a folder to watch
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => updateImagesDb()}
          >
            update images database
          </button>
        </div>
        <div className="lg:w-1/2 md:w-full">
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
                  <tr key={`setting_watchfolder_${watchFolder}`}>
                    <td>{watchFolder}</td>
                    <td className="flex justify-end">
                      <div className="flex flex-row">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-6 h-6 cursor-pointer mx-2"
                          onClick={() => editWatchFolder(watchFolder)}
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
                          onClick={() => confirmRemoveWatchFolder(watchFolder)}
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
      </section>
    </>
  );
}
