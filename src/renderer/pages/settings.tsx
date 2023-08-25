import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from 'renderer/redux';
import {
  readCheckpointsDir,
  setCheckpointsPath,
  setImagesPath,
  organizeImages,
  setImagesDestPath,
} from 'renderer/redux/reducers/global';

export default function Settings() {
  const { settings } = useSelector((state: RootState) => state.global);
  const dispatch = useDispatch<AppDispatch>();

  const onSelectCheckpointsDir = async () => {
    const path = await window.ipcHandler.selectDir();
    dispatch(setCheckpointsPath(path as string));
    dispatch(readCheckpointsDir());
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
