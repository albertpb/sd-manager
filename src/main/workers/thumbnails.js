// worker.js

const { parentPort } = require('worker_threads');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

const processImage = async (imageFile, thumbnailDestPath) => {
  try {
    const fileExists = fs.existsSync(imageFile);
    if (fileExists) {
      const basePath = path.dirname(thumbnailDestPath);
      const folderExists = fs.existsSync(basePath);

      if (!folderExists) {
        fs.mkdirSync(basePath);
      }

      await sharp(imageFile)
        .resize({ height: 400 })
        .toFormat('webp')
        .toFile(thumbnailDestPath);
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

// Listen for messages from the main thread
parentPort.on('message', async ({ imageFile, thumbnailDestPath }) => {
  try {
    await processImage(imageFile, thumbnailDestPath);
    parentPort.postMessage({ type: 'result', message: null });
  } catch (error) {
    parentPort.postMessage({ type: 'error', message: error.message });
  }
});
