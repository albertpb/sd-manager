import { useSelector } from 'react-redux';
import { RootState } from 'renderer/redux';
import Models from './models';

export default function Checkpoints() {
  const loras = useSelector((state: RootState) => state.global.checkpoint);

  return <Models modelsState={loras} type="checkpoint" />;
}
