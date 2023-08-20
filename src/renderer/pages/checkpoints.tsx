import Fuse from 'fuse.js';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'renderer/redux';
import ModelCard from 'renderer/components/ModelCard';
import { selectModel } from 'renderer/redux/reducers/global';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Checkpoints() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const checkpoints = useSelector(
    (state: RootState) => state.global.checkpoints
  );
  const settings = useSelector((state: RootState) => state.global.settings);
  const navbarSearchInput = useSelector(
    (state: RootState) => state.global.navbarSearchInput
  );

  const [width, setWidth] = useState('320px');
  const [height, setHeight] = useState('480px');

  const onClick = (name: string) => {
    dispatch(
      selectModel({
        name,
        type: 'checkpoint',
      })
    );

    navigate('/model-detail');
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [navbarSearchInput]);

  const modelsList = Object.values(checkpoints.filesInfo);
  const fuse = new Fuse(modelsList, {
    keys: ['fileName'],
  });

  const resultCards =
    navbarSearchInput === ''
      ? modelsList.map((chkpt) => {
          return {
            item: chkpt,
            matches: [],
            score: 1,
          };
        })
      : fuse.search(navbarSearchInput);

  const cards = resultCards.map(({ item }) => {
    const imagePath = `${settings.checkpointsPath}\\${item.fileName}\\${item.fileName}_0.png`;
    return (
      <div
        onClick={() => onClick(item.fileName)}
        key={`${item.hash}_${item.fileName}`}
        aria-hidden="true"
      >
        <ModelCard
          name={item.fileName}
          imagePath={imagePath}
          width={width}
          height={height}
        />
      </div>
    );
  });

  return <section className="flex flex-row flex-wrap">{cards}</section>;
}
