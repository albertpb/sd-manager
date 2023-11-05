import { useSelector } from 'react-redux';
import { RootState } from 'renderer/redux';
import Models from './models';

export default function Loras() {
  const loras = useSelector((state: RootState) => state.global.lora);

  return <Models modelsState={loras} type="lora" />;
}
