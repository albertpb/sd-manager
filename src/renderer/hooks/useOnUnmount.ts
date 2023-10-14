import { DependencyList, useEffect, useRef } from 'react';

const useOnUnmount = (
  callback: () => void,
  dependencies: DependencyList | undefined
) => {
  const isUnmounting = useRef(false);

  useEffect(() => () => (isUnmounting.current = true), []);

  useEffect(
    () => () => {
      if (isUnmounting.current) {
        callback();
      }
    },
    dependencies
  );
};

export default useOnUnmount;
