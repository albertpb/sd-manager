import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from 'renderer/redux';
import {
  readCheckpointsDir,
  setCheckpointsPath,
  setImagesPath,
  organizeImages,
  setImagesDestPath,
  setLorasPath,
  readLorasDir,
  setScanModelsOnStart,
} from 'renderer/redux/reducers/global';

export default function Settings() {
  const { settings } = useSelector((state: RootState) => state.global);
  const dispatch = useDispatch<AppDispatch>();

  const onSelectCheckpointsDir = async () => {
    const path = await window.ipcHandler.selectDir();
    dispatch(setCheckpointsPath(path as string));
    dispatch(readCheckpointsDir());
  };

  const onSelectLorasDir = async () => {
    const path = await window.ipcHandler.selectDir();
    dispatch(setLorasPath(path as string));
  };

  const onReadLorasDir = async () => {
    await dispatch(readLorasDir());
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

  return (
    <section className="m-4 w-full">
      <div>
        <p className="text-2xl">Settings</p>
      </div>
      <div className="mt-3 flex flex-row items-center w-1/2">
        <div className="mr-4 w-2/3">
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
        <div className="mr-4 w-2/3">
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
          <div>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => onReadLorasDir()}
            >
              Scan
            </button>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-row items-center w-1/2 form-control">
        <label
          className="label cursor-pointer ml-0 pl-0 w-full justify-start"
          htmlFor="scanModelsOnStart"
        >
          <span className="label-text text-base mr-4 w-2/3">
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
        <div className="mr-4 w-2/3">
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
        <div className="mr-4 w-2/3">
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
        <div className="mr-4 w-2/3">
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
    </section>
  );
}
