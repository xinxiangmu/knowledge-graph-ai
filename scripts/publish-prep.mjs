import * as fs from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(__dirname, '..');

const publishDir = resolve(pluginRoot, '../dist-publish');

if (fs.existsSync(publishDir)) {
  fs.rmSync(publishDir, { recursive: true });
}
fs.mkdirSync(publishDir, { recursive: true });

const filesToCopy = [
  { source: resolve(pluginRoot, 'manifest.json'), dest: resolve(publishDir, 'manifest.json') },
  { source: resolve(pluginRoot, 'styles.css'), dest: resolve(publishDir, 'styles.css') },
  { source: resolve(pluginRoot, 'README.md'), dest: resolve(publishDir, 'README.md') },
  { source: resolve(pluginRoot, 'LICENSE'), dest: resolve(publishDir, 'LICENSE') },
  { source: resolve(pluginRoot, 'package.json'), dest: resolve(publishDir, 'package.json') },
  { source: resolve(pluginRoot, 'tsconfig.json'), dest: resolve(publishDir, 'tsconfig.json') },
  { source: resolve(pluginRoot, '.github/workflows/release.yml'), dest: resolve(publishDir, '.github/workflows/release.yml') },
  { source: resolve(pluginRoot, '.github/workflows/ci.yml'), dest: resolve(publishDir, '.github/workflows/ci.yml') },
];

const dirsToCopy = [
  { source: resolve(pluginRoot, 'src'), dest: resolve(publishDir, 'src') },
  { source: resolve(pluginRoot, 'scripts'), dest: resolve(publishDir, 'scripts') },
];

console.log('Preparing publish files (source only)...');

filesToCopy.forEach(({ source, dest }) => {
  if (fs.existsSync(source)) {
    const destDir = dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(source, dest);
    console.log(`✓ ${dest.replace(publishDir, '')}`);
  } else {
    console.warn(`⚠️ ${source} not found, skipping`);
  }
});

const copyDir = (srcDir, destDir) => {
  if (!fs.existsSync(srcDir)) return;
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const files = fs.readdirSync(srcDir);
  files.forEach(file => {
    const srcPath = resolve(srcDir, file);
    const destPath = resolve(destDir, file);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (!file.endsWith('.backup') && !file.endsWith('.grafeo-backup') && file !== 'public_key.pem') {
      fs.copyFileSync(srcPath, destPath);
    }
  });
};

dirsToCopy.forEach(({ source, dest }) => {
  copyDir(source, dest);
  console.log(`✓ ${dest.replace(publishDir, '')}/`);
});

console.log(`\n📦 Publish files ready in: ${publishDir}`);
console.log('\n📁 Directory structure (source only):');
console.log(`dist-publish/`);
console.log(`├── manifest.json        # Plugin metadata`);
console.log(`├── styles.css           # Plugin styles`);
console.log(`├── README.md            # Plugin documentation`);
console.log(`├── LICENSE              # MIT License`);
console.log(`├── package.json         # npm dependencies`);
console.log(`├── tsconfig.json        # TypeScript config`);
console.log(`├── src/                 # Source code (TypeScript)`);
console.log(`│   ├── main.ts`);
console.log(`│   ├── services/`);
console.log(`│   ├── ui/`);
console.log(`│   ├── models/`);
console.log(`│   └── utils/`);
console.log(`├── scripts/             # Build scripts`);
console.log(`│   └── esbuild.config.mjs`);
console.log(`└── .github/workflows/`);
console.log(`    ├── release.yml      # Auto build & release`);
console.log(`    └── ci.yml           # CI tests`);
console.log('\n🚀 Usage:');
console.log('1. Create GitHub repo: knowledge-graph-ai');
console.log('2. Run:');
console.log('   cd dist-publish');
console.log('   git init && git add .');
console.log('   git commit -m "Initial release"');
console.log('   git remote add origin https://github.com/your-username/knowledge-graph-ai.git');
console.log('   git push -u origin main');
console.log('3. GitHub Actions will auto-build and create release');
console.log('4. Submit to Obsidian community plugins');
