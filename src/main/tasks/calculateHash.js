// worker.js

const { parentPort } = require('worker_threads');
const hashWasm = require('hash-wasm');
const fs = require('fs');

async function hashFile(filePath) {
  const hash = await hashWasm.createBLAKE3();
  const readStream = fs.createReadStream(filePath);

  readStream.on('data', (data) => {
    hash.update(data);
  });

  readStream.on('end', () => {
    const fileHash = hash.digest('hex');
    parentPort.postMessage({ type: 'hashResult', hash: fileHash });
  });

  readStream.on('error', (error) => {
    parentPort.postMessage({ type: 'error', message: error.message });
  });
}

// Listen for messages from the main thread
parentPort.on('message', async (message) => {
  if (message.type === 'hash') {
    await hashFile(message.filePath);
  }
});
