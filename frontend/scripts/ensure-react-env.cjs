/**
 * CRA only inlines REACT_APP_* from .env* files and the parent process env at build time.
 * Some hosts run `npm run build --prefix frontend` from the repo root; writing
 * .env.production.local here guarantees the value reaches react-scripts reliably.
 * When unset, remove stale file so cached builds do not keep an old URL.
 */
const fs = require('fs');
const path = require('path');

const frontendRoot = path.join(__dirname, '..');
const target = path.join(frontendRoot, '.env.production.local');
const raw = process.env.REACT_APP_API_URL;
const value = typeof raw === 'string' ? raw.trim() : '';

if (value) {
  fs.writeFileSync(target, `REACT_APP_API_URL=${value}\n`, 'utf8');
  process.stdout.write('ensure-react-env: wrote REACT_APP_API_URL to .env.production.local\n');
} else {
  try {
    fs.unlinkSync(target);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  process.stdout.write(
    'ensure-react-env: no REACT_APP_API_URL; removed .env.production.local if present\n'
  );
}
