import { app } from 'electron';

export const getPathsIpc = async () => {
  const documentsPath = app.getPath('documents');
  const appPath = app.getPath('appData');

  return {
    documentsPath,
    appPath,
  };
};
