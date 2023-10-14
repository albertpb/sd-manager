import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from 'renderer/redux';
import {
  setCheckpointsPath,
  setImagesPath,
  organizeImages,
  setImagesDestPath,
  setLorasPath,
  setScanModelsOnStart,
  unInit,
  setTheme,
} from 'renderer/redux/reducers/global';
import themes from '../../../themes';

export default function Settings() {
  const { settings } = useSelector((state: RootState) => state.global);
  const dispatch = useDispatch<AppDispatch>();

  const onSelectCheckpointsDir = async () => {
    const path = await window.ipcHandler.selectDir();
    dispatch(setCheckpointsPath(path as string));
    dispatch(unInit());
  };

  const onSelectLorasDir = async () => {
    const path = await window.ipcHandler.selectDir();
    dispatch(setLorasPath(path as string));
    dispatch(unInit());
  };

  const onSelectImagesDir = async () => {
    const path = await window.ipcHandler.selectDir();
    if (path !== '') {
      dispatch(setImagesPath(path as string));
      window.ipcHandler.watchImagesFolder(settings.imagesPath);
    }
  };

  const onSelectDestImagesDir = async () => {
    const path = await window.ipcHandler.selectDir();
    if (path !== '') {
      dispatch(setImagesDestPath(path as string));
      window.ipcHandler.watchImagesFolder(settings.imagesPath);
    }
  };

  const onScanModelsOnStart = async (value: boolean) => {
    dispatch(setScanModelsOnStart(value ? '1' : '0'));
  };

  const onOrganizeImagesClick = async () => {
    await dispatch(organizeImages());
  };

  const changeTheme = async (theme: string) => {
    window.document.documentElement.setAttribute('data-theme', theme);
    await dispatch(setTheme(theme));
  };

  return (
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
          <p>
            <span>Source Images folder:</span> {settings.imagesPath}{' '}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => onSelectImagesDir()}
        >
          Change
        </button>
      </div>
      <div className="mt-3 flex flex-row items-center w-1/2">
        <div className="w-2/3">
          <p>
            <span>Destination Images folder:</span> {settings.imagesDestPath}{' '}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => onSelectDestImagesDir()}
        >
          Change
        </button>
      </div>
      <div className="mt-3 flex flex-row items-center w-1/2">
        <div className="w-2/3">
          <p>
            Copy Images folder into the destination images folder sorted by
            models{' '}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => onOrganizeImagesClick()}
        >
          Scan Images
        </button>
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
              <option value={theme}>{`${theme[0].toUpperCase()}${theme.slice(
                1,
              )}`}</option>
            );
          })}
        </select>
      </div>
    </section>
  );
}
