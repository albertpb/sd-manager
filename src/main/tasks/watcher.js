// worker.js

const { parentPort } = require('worker_threads');
const chokidar = require('chokidar');

let watcherImagesFolder = null;

// Listen for messages from the main thread
parentPort.on('message', async (foldersToWatch) => {
  if (watcherImagesFolder !== null) {
    watcherImagesFolder.close();
  }

  watcherImagesFolder = chokidar.watch(
    foldersToWatch.map((f) => f.path),
    {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: true,
    },
  );

  watcherImagesFolder.on('add', async (detectedFile) => {
    parentPort.postMessage(detectedFile);
  });
});
