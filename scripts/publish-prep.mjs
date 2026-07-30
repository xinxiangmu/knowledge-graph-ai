import * as fs from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(__dirname, '..');
const releaseDir = resolve(pluginRoot, 'release');

if (fs.existsSync(releaseDir)) {
  fs.rmSync(releaseDir, { recursive: true });
}
fs.mkdirSync(releaseDir, { recursive: true });

const filesToCopy = [
  'manifest.json',
  'styles.css',
  'README.md',
  'LICENSE',
  'package.json',
  'tsconfig.json',
  'versions.json',
  'main.js',
];

const dirsToCopy = ['.github', 'src', 'scripts', 'dist'];

console.log('Preparing release files...');

filesToCopy.forEach(file => {
  const source = resolve(pluginRoot, file);
  const dest = resolve(releaseDir, file);
  if (fs.existsSync(source)) {
    const destDir = dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(source, dest);
    console.log(`✓ ${file}`);
  }
});

dirsToCopy.forEach(dir => {
  const source = resolve(pluginRoot, dir);
  const dest = resolve(releaseDir, dir);
  if (!fs.existsSync(source)) return;
  const copyDir = (srcDir, destDirPath) => {
    if (!fs.existsSync(destDirPath)) {
      fs.mkdirSync(destDirPath, { recursive: true });
    }
    const files = fs.readdirSync(srcDir);
    files.forEach(file => {
      const srcPath = resolve(srcDir, file);
      const destPath = resolve(destDirPath, file);
      const stat = fs.statSync(srcPath);
      if (stat.isDirectory()) {
        copyDir(srcPath, destPath);
      } else if (!file.endsWith('.backup') && !file.endsWith('.grafeo-backup')) {
        fs.copyFileSync(srcPath, destPath);
      }
    });
  };
  copyDir(source, dest);
  console.log(`✓ ${dir}/`);
});

console.log(`\nRelease files ready in: ${releaseDir}`);