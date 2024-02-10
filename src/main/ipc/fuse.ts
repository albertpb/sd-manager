import { IpcMainInvokeEvent, app } from 'electron';
import fs from 'fs';

export async function saveFuseIndexIpc(
  event: IpcMainInvokeEvent,
  fileName: string,
  data: any,
) {
  const folderPath = app.getPath('userData');

  await fs.promises.writeFile(
    `${folderPath}\\${fileName}`,
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

    const data = await fs.promises.readFile(`${folderPath}\\${fileName}`, {
      encoding: 'utf-8',
    });

    return JSON.parse(data);
  } catch (error) {
    console.log(error);
    return undefined;
  }
}
