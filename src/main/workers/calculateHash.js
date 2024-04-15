// worker.js

const { parentPort } = require('worker_threads');
const hashWasm = require('hash-wasm');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function hashFileBlake3(filePath) {
  const parsedPath = path.parse(filePath);
  const fileHashOnDiskPath = `${parsedPath.dir}\\${parsedPath.name}.blake3`;

  if (fs.existsSync(fileHashOnDiskPath)) {
    parentPort.postMessage({
      type: 'result',
      message: fs.readFileSync(fileHashOnDiskPath, { encoding: 'utf-8' }),
    });
    return;
  }

  const hash = await hashWasm.createBLAKE3();
  const readStream = fs.createReadStream(filePath, {
    highWaterMark: 256 * 1024,
  });

  readStream.on('data', (data) => {
    hash.update(data);
  });

  readStream.on('end', () => {
    const fileHash = hash.digest('hex');
    fs.writeFileSync(fileHashOnDiskPath, fileHash, { encoding: 'utf-8' });
    parentPort.postMessage({ type: 'result', message: fileHash });
  });

  readStream.on('error', (error) => {
    parentPort.postMessage({ type: 'error', message: error.message });
  });
}

async function hashSha256(filePath) {
  const parsedPath = path.parse(filePath);
  const fileHashOnDiskPath = `${parsedPath.dir}\\${parsedPath.name}.sha256`;

  if (fs.existsSync(fileHashOnDiskPath)) {
    parentPort.postMessage({
      type: 'result',
      message: fs.readFileSync(fileHashOnDiskPath, { encoding: 'utf-8' }),
    });
    return;
  }

  const hash = crypto.createHash('sha256');
  const readStream = fs.createReadStream(filePath);

  readStream.on('data', (data) => {
    hash.update(data);
  });

  readStream.on('end', () => {
    const fileHash = hash.digest('hex');
    fs.writeFileSync(fileHashOnDiskPath, fileHash, { encoding: 'utf-8' });
    parentPort.postMessage({ type: 'result', message: fileHash });
  });

  readStream.on('error', (error) => {
    parentPort.postMessage({ type: 'error', message: error.message });
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
