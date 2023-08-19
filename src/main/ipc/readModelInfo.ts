import { IpcMainInvokeEvent } from 'electron';
import { readModelInfoFile } from '../util';

export const readModelInfoIpc = async (
  event: IpcMainInvokeEvent,
  model: string,
  folderPath: string
) => {
  const modelInfo = await readModelInfoFile(
    `${folderPath}\\${model}.civitai.info`
  );

  return modelInfo;
};
