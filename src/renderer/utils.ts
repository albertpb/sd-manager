export function debounce<T extends any[]>(
  func: (...args: T) => void,
  delay: number
) {
  let timerId: ReturnType<typeof setTimeout>;

  return (...args: T) => {
    clearTimeout(timerId);

    timerId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

const saveMd = async (
  selectedModel: string | undefined,
  fileBaseName: string | undefined,
  value: string
) => {
  if (selectedModel && fileBaseName) {
    console.log('saving markdown', selectedModel, fileBaseName);
    await window.ipcHandler.saveMD(selectedModel, fileBaseName, value);
  }
};

export const saveMdDebounced = debounce(saveMd, 1000);

export const getFilenameNoExt = (fileName: string) => {
  return fileName.substring(0, fileName.lastIndexOf('.'));
};

export const getFileNameExt = (fileName: string) => {
  return fileName.split('.').pop();
};
