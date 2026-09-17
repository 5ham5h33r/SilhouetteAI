const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

function createStorage(seed = {}) {
  const data = structuredClone(seed);
  return {
    data,
    async get(key) {
      if (key === null) return structuredClone(data);
      if (typeof key === 'string') return { [key]: structuredClone(data[key]) };
      const out = {};
      for (const item of key) out[item] = structuredClone(data[item]);
      return out;
    },
    async set(values) {
      Object.assign(data, structuredClone(values));
    },
    async remove(keys) {
      for (const key of [].concat(keys)) delete data[key];
    },
  };
}

function loadModules(files, seed = {}) {
  const storage = createStorage(seed);
  const sandbox = {
    window: {},
    chrome: { storage: { local: storage } },
    crypto: webcrypto,
    console,
    Map,
    Set,
    Date,
    RegExp,
  };
  vm.createContext(sandbox);
  for (const file of files) {
    const fullPath = path.join(__dirname, '..', 'extension', 'content', file);
    vm.runInContext(fs.readFileSync(fullPath, 'utf8'), sandbox, { filename: file });
  }
  return { SILH: sandbox.window.__SILH, storage };
}

module.exports = { loadModules };
