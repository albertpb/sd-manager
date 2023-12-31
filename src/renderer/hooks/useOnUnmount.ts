import { DependencyList, useEffect, useRef } from 'react';

const useOnUnmount = (
  callback: () => void,
  dependencies: DependencyList | undefined,
) => {
  const isUnmounting = useRef(false);

  useEffect(
    () => () => {
      isUnmounting.current = true;
    },
    [],
  );

  useEffect(
    () => () => {
      if (isUnmounting.current) {
        callback();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dependencies],
  );
};

export default useOnUnmount;
