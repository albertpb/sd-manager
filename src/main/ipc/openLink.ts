import { IpcMainInvokeEvent, shell } from 'electron';

export const openLinkIpc = async (event: IpcMainInvokeEvent, url: string) => {
  shell.openExternal(url);
};

export const openFolderLinkIpc = async (
  event: IpcMainInvokeEvent,
  url: string,
) => {
  shell.showItemInFolder(url);
};
