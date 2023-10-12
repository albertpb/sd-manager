import { IpcMainInvokeEvent } from 'electron';
import fs from 'fs';
import { extractMetadata } from '../exif';
import { checkFileExists } from '../util';

export const readImageMetadata = async (
  event: IpcMainInvokeEvent,
  path: string
) => {
  const fileExists = await checkFileExists(path);

  if (fileExists) {
    const file = fs.readFileSync(path);

    const metadata = extractMetadata(file);
    const keys = Object.keys(metadata);
    for (let i = 0; i < keys.length; i++) {
      if (typeof metadata[keys[i]] === 'string') {
        try {
          metadata[keys[i]] = JSON.parse(metadata[keys[i]]);
        } catch (e) {
          console.log(`Couldn't parse metadata value`);
        }
      }
    }

    return metadata;
  }

  return {};
};