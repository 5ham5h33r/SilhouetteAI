const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const manifestPath = path.join(root, 'extension', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const referenced = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  manifest.options_page,
  ...Object.values(manifest.icons || {}),
  ...Object.values(manifest.action?.default_icon || {}),
  ...manifest.content_scripts.flatMap((entry) => [...entry.js, ...(entry.css || [])]),
].filter(Boolean);

const missing = referenced.filter((file) => !fs.existsSync(path.join(root, 'extension', file)));
if (missing.length) {
  console.error('Manifest references missing files:\n' + missing.join('\n'));
  process.exit(1);
}

if (manifest.version !== require('../package.json').version) {
  console.error('Manifest and package versions do not match.');
  process.exit(1);
}

console.log(`Validated SilhouetteAI v${manifest.version}: ${new Set(referenced).size} assets present.`);
