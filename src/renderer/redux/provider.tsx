import { Provider } from 'react-redux';
import { ReactNode } from 'react';
import { store } from './index';

export function ReduxProvider({ children }: { children: ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
