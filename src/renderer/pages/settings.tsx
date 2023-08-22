import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from 'renderer/redux';
import {
  readCheckpointsDir,
  setCheckpointsPath,
  setImagesPath,
  organizeImages,
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

  const onOrganizeImagesClick = async () => {
    await dispatch(organizeImages());
  };

  return (
    <section className="m-4">
      <div>
        Checkpoints folder: {settings.checkpointsPath}{' '}
        <button
          type="button"
          className="btn"
          onClick={() => onSelectCheckpointsDir()}
        >
          Change
        </button>
      </div>
      <div>
        Images folder: {settings.imagesPath}{' '}
        <button
          type="button"
          className="btn"
          onClick={() => onSelectImagesDir()}
        >
          Change
        </button>
      </div>
      <div>
        Copy Images folder into the Documents folder sorted by models{' '}
        <button
          type="button"
          className="btn"
          onClick={() => onOrganizeImagesClick()}
        >
          Organize Images
        </button>
      </div>
    </section>
  );
}
