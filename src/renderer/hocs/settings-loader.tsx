import { ReactNode, useEffect, useState } from 'react';
import { loadSettings, settingsAtom } from 'renderer/state/settings.store';
import { useAtom } from 'jotai';

export default function SettingsLoader({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState<boolean>(false);
  const [settingsState] = useAtom(settingsAtom);

  useEffect(() => {
    // load settings
    const loadConf = async () => {
      if (!loaded) {
        await loadSettings();
        window.document.documentElement.setAttribute(
          'data-theme',
          settingsState.theme || 'default',
        );
        setLoaded(true);
      }
    };

    loadConf();
  }, [settingsState, loaded]);

  if (!loaded) return null;

  return children;
}
