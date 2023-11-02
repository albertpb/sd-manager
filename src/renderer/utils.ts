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

export function generateRandomId(length: number) {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomId = '';
  const crypto = window.crypto;

  if (crypto && crypto.getRandomValues) {
    const values = new Uint32Array(length);
    crypto.getRandomValues(values);

    for (let i = 0; i < length; i++) {
      randomId += charset[values[i] % charset.length];
    }
  } else {
    // Fallback for older browsers that don't support crypto.getRandomValues
    for (let i = 0; i < length; i++) {
      randomId += charset[Math.floor(Math.random() * charset.length)];
    }
  }

  return randomId;
}
