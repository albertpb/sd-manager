export function debounce<T extends any[]>(
  func: (...args: T) => void,
  d: number,
) {
  let timerId: ReturnType<typeof setTimeout>;

  return (...args: T) => {
    clearTimeout(timerId);

    timerId = setTimeout(() => {
      func(...args);
    }, d);
  };
}

export function throttle(func: Function, d: number): Function {
  let lastExecTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null;

  return function (...args: any[]) {
    const now = Date.now();

    if (now - lastExecTime < d) {
      // Cancel the previous setTimeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Set a new setTimeout
      timeoutId = setTimeout(() => {
        lastExecTime = now;
        func(...args);
      }, d);
    } else {
      lastExecTime = now;
      func(...args);
    }
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

export function getTextColorFromBackgroundColor(bgColorHex: string): string {
  // Convert the hex color to RGB values.
  const r = parseInt(bgColorHex.slice(1, 3), 16);
  const g = parseInt(bgColorHex.slice(3, 5), 16);
  const b = parseInt(bgColorHex.slice(5, 7), 16);

  // Calculate the relative luminance.
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  // Determine the text color based on luminance.
  const textColorHex = luminance > 128 ? '#000000' : '#FFFFFF';

  return textColorHex;
}

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function areBoxesIntersecting(box1: Box, box2: Box): boolean {
  return (
    box1.x < box2.x + box2.width &&
    box1.x + box1.width > box2.x &&
    box1.y < box2.y + box2.height &&
    box1.y + box1.height > box2.y
  );
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function convertPath(inputPath: string, os: string): string {
  if (os === 'win32') return inputPath;

  if (os === 'linux') return inputPath.replace(/\\/g, '/');

  return inputPath;
}
