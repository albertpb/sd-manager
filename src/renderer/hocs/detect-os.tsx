import { createContext, ReactNode, useEffect, useState } from 'react';

export const OsContext = createContext('');

export function DetectOs({ children }: { children: ReactNode }) {
  const [os, setOs] = useState('');

  useEffect(() => {
    async function getOs() {
      const result = await window.ipcHandler.getOS();
      setOs(result);
    }
    if (!os) {
      getOs();
    }
  }, [os]);

  if (!os) return null;

  return <OsContext.Provider value={os}>{children}</OsContext.Provider>;
}
