import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const tabs = {
  checkpoints: {
    id: 'checkpoints',
    label: 'Checkpoints',
    path: '/',
  },
};
export type Tabs = keyof typeof tabs | null;

export default function useTab() {
  const [tab, setTab] = useState<Tabs>(null);

  const location = useLocation();
  const pathName = location.pathname;

  useEffect(() => {
    if (pathName === '/') {
      setTab('checkpoints');
    } else {
      setTab(null);
    }
  }, [pathName]);

  return tab;
}
