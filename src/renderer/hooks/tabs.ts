import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const tabs = {
  checkpoints: {
    id: 'checkpoints',
    label: 'Checkpoints',
    path: '',
  },
  loras: {
    id: 'loras',
    label: 'Loras',
    path: 'loras',
  },
  images: {
    id: 'images',
    label: 'Images',
    path: 'images',
  },
  /*
  arHelper: {
    id: 'arHelper',
    label: 'AspectRatio Helper',
    path: 'ar-helper',
  },
  */
  imageMetadata: {
    id: 'imageMetadata',
    label: 'Png Info',
    path: 'image-metadata',
  },
  /*
  test: {
    id: 'test',
    label: 'test',
    path: 'test',
  },
  */
};
export type Tabs = keyof typeof tabs | null;

export default function useTab() {
  const [tab, setTab] = useState<Tabs>(null);

  const location = useLocation();
  const pathName = location.pathname;

  useEffect(() => {
    const currentTab = Object.values(tabs).find(
      (t) => `/${t.path}` === pathName,
    );
    if (currentTab) {
      setTab(currentTab.id as Tabs);
    } else {
      setTab(null);
    }
  }, [pathName]);

  return tab;
}
