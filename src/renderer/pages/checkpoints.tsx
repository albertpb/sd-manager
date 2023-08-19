import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'renderer/redux';
import ModelCard from 'renderer/components/ModelCard';
import { selectModel } from 'renderer/redux/reducers/global';
import { useNavigate } from 'react-router-dom';

export default function Checkpoints() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const checkpoints = useSelector(
    (state: RootState) => state.global.checkpoints
  );
  const settings = useSelector((state: RootState) => state.global.settings);

  const onClick = (name: string) => {
    dispatch(
      selectModel({
        name,
        type: 'checkpoint',
      })
    );

    navigate('/model-detail');
  };

  const cards = Object.entries(checkpoints.filesInfo).map(([name, item]) => {
    const imagePath = `${settings.checkpointsPath}\\${name}.png`;
    return (
      <div onClick={() => onClick(name)} key={item.hash} aria-hidden="true">
        <ModelCard name={name} imagePath={imagePath} />
      </div>
    );
  });

  return <section className="flex flex-row">{cards}</section>;
}
