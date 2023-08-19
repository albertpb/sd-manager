import { IpcMainInvokeEvent } from 'electron';
import fs from 'fs';

export const readdirIpc = async (
  event: IpcMainInvokeEvent,
  folderPath: string
) => {
  const files = fs.readdirSync(folderPath);
};
