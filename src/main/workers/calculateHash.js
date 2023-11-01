// worker.js

const { parentPort } = require('worker_threads');
const hashWasm = require('hash-wasm');
const crypto = require('crypto');
const fs = require('fs');

async function hashFileBlake3(filePath) {
  const hash = await hashWasm.createBLAKE3();
  const readStream = fs.createReadStream(filePath);

  readStream.on('data', (data) => {
    hash.update(data);
  });

  readStream.on('end', () => {
    const fileHash = hash.digest('hex');
    parentPort.postMessage({ type: 'hashResult', hash: fileHash });
    parentPort.close();
  });

  readStream.on('error', (error) => {
    parentPort.postMessage({ type: 'error', message: error.message });
    parentPort.close();
  });
}

async function hashSha256(filePath) {
  const hash = crypto.createHash('sha256');
  const readStream = fs.createReadStream(filePath);

  readStream.on('data', (data) => {
    hash.update(data);
  });

  readStream.on('end', () => {
    const fileHash = hash.digest('hex');
    parentPort.postMessage({ type: 'hashResult', hash: fileHash });
    parentPort.close();
  });

  readStream.on('error', (error) => {
    parentPort.postMessage({ type: 'error', message: error.message });
    parentPort.close();
  });
}

// Listen for messages from the main thread
parentPort.on('message', async ({ algorithm, filePath }) => {
  if (algorithm === 'blake3') {
    await hashFileBlake3(filePath);
  }
  if (algorithm === 'sha256') {
    await hashSha256(filePath);
  }
});
