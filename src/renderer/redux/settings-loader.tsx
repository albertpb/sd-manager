import { useNavigate } from 'react-router-dom';
import { ReactNode, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '.';
import { loadSettings } from './reducers/global';

export default function SettingsLoader({ children }: { children: ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    // load settings
    const loadConf = async () => {
      if (!loaded) {
        const response: Record<string, any> = await dispatch(loadSettings());
        setLoaded(true);

        if (
          response.payload?.checkpointsPath === null ||
          response.payload?.checkpointsPath === undefined
        ) {
          navigate('/settings');
        }
      }
    };

    loadConf();
  }, [dispatch, navigate, loaded]);

  if (loaded) {
    return children;
  }
  return null;
}
