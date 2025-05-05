import { IpcMainInvokeEvent, app } from 'electron';
import os from 'os';
import fs from 'fs';
import { convertPath } from '../../renderer/utils';

export async function saveFuseIndexIpc(
  event: IpcMainInvokeEvent,
  fileName: string,
  data: any,
) {
  const folderPath = app.getPath('userData');

  await fs.promises.writeFile(
    convertPath(`${folderPath}\\${fileName}`, os.platform()),
    JSON.stringify(data),
    {
      encoding: 'utf-8',
    },
  );
}

export async function readFuseIndexIpc(
  event: IpcMainInvokeEvent,
  fileName: string,
) {
  try {
    const folderPath = app.getPath('userData');

    const data = await fs.promises.readFile(
      convertPath(`${folderPath}\\${fileName}`, os.platform()),
      {
        encoding: 'utf-8',
      },
    );

    return JSON.parse(data);
  } catch (error) {
    console.log(error);
    return undefined;
  }
}
