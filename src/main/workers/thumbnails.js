// worker.js

const { parentPort } = require('worker_threads');
const sharp = require('sharp');
const fs = require('fs');

const processImage = async (imageFile, thumbnailDestPath) => {
  try {
    const fileExists = fs.existsSync(thumbnailDestPath);
    if (!fileExists) {
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
