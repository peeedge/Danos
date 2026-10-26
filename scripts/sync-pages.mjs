import { cpSync, copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const distAssets = path.join('dist', 'assets');
if (!existsSync(distAssets)) {
  throw new Error('dist/assets is missing. Run npm run build first.');
}

rmSync('assets', { recursive: true, force: true });
mkdirSync('assets', { recursive: true });
cpSync(distAssets, 'assets', { recursive: true });

const files = readdirSync('assets');
const js = files.find((name) => name.endsWith('.js'));
const css = files.find((name) => name.endsWith('.css'));
if (js && js !== 'danos.js') copyFileSync(path.join('assets', js), path.join('assets', 'danos.js'));
if (css && css !== 'danos.css') copyFileSync(path.join('assets', css), path.join('assets', 'danos.css'));

if (existsSync(path.join('dist', 'favicon.svg'))) {
  copyFileSync(path.join('dist', 'favicon.svg'), 'favicon.svg');
}
if (existsSync(path.join('dist', '.nojekyll'))) {
  copyFileSync(path.join('dist', '.nojekyll'), '.nojekyll');
}

console.log('Synced GitHub Pages files:', readdirSync('assets').join(', '));
