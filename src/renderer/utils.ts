export function debounce<T extends any[]>(
  func: (...args: T) => void,
  delay: number,
) {
  let timerId: ReturnType<typeof setTimeout>;

  return (...args: T) => {
    clearTimeout(timerId);

    timerId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

const saveMd = async (path: string, value: string) => {
  await window.ipcHandler.saveMD(path, value);
};

export const saveMdDebounced = debounce(saveMd, 1000);
