const fs = require('fs');
const crypto = require('crypto');
const { parentPort, workerData } = require('worker_threads');

const { filePath, algorithm } = workerData;

function checkFileExists(file) {
  return fs.accessSync(file, fs.constants.F_OK);
}

function calculateHashFile() {
  const shasum = crypto.createHash(algorithm);

  checkFileExists(filePath);

  const stream = fs.createReadStream(filePath);
  stream.on('data', (data) => {
    shasum.update(data);
  });

  stream.on('end', () => {
    const hash = shasum.digest('hex');
    parentPort?.postMessage(hash);
  });
}

calculateHashFile();
