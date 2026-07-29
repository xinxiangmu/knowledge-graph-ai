import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = __dirname;
const srcDir = path.join(rootDir, 'src');
const outputDir = path.join(rootDir, 'obsidian-knowledge-graph-plugin');
const obsidianPluginsDir = '/Users/zero/Documents/Obsidian Vault/.obsidian/plugins/obsidian-knowledge-graph';

const buildConfig = {
  version: process.env.VERSION || '1.0.0',
  description: process.env.DESCRIPTION || 'Build AI-powered knowledge graphs from your Obsidian vault',
  main: 'main.js'
};

const envTemplate = `PORT={{PORT}}
DB_PATH={{DB_PATH}}
`;

// Helper to copy directory recursively
const copyDir = (src, dest) => {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

// Clean output directory
if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true, force: true });
}
fs.mkdirSync(outputDir, { recursive: true });

console.log('🔍 Building plugin with esbuild...');

// Step 1: Run esbuild to bundle main.js
console.log('📦 Running esbuild...');
try {
  execSync('npm run build', {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('  ✓ esbuild completed successfully');
} catch (error) {
  console.error('  ✗ esbuild failed:', error.message);
  process.exit(1);
}

// Step 2: Copy main files (main.js is now bundled with all dependencies)
console.log('📁 Copying main files...');
const mainFiles = ['main.js', 'main.js.map', 'styles.css', 'manifest.json', 'LICENSE', 'README.md'];
for (const file of mainFiles) {
  const srcPath = path.join(rootDir, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, path.join(outputDir, file));
    console.log(`  Copied: ${file}`);
  }
}

// Step 3: Copy subdirectories with compiled JS files
console.log('📦 Copying subdirectories...');
const subdirs = ['models', 'services', 'ui', 'verification', 'utils'];

// First, try to copy compiled files from dist/
let compiled = false;
if (fs.existsSync(path.join(rootDir, 'dist'))) {
  console.log('  Looking for compiled files in dist/');
  for (const dir of subdirs) {
    const srcPath = path.join(rootDir, 'dist', dir);
    const destPath = path.join(outputDir, dir);

    if (fs.existsSync(srcPath)) {
      copyDir(srcPath, destPath);
      console.log(`  Copied (compiled): ${dir}/`);
      compiled = true;
    }
  }
}

// If no compiled files found, copy from src/
if (!compiled) {
  console.log('  No compiled files found, copying from src/');
  for (const dir of subdirs) {
    const srcPath = path.join(srcDir, dir);
    const destPath = path.join(outputDir, dir);

    if (fs.existsSync(srcPath)) {
      copyDir(srcPath, destPath);
      console.log(`  Copied: ${dir}/`);
    }
  }
}

// Step 4: Copy extra resource files from src directory
console.log('📄 Copying extra resource files...');
if (fs.existsSync(path.join(srcDir, 'ui', 'sigma-graph-view.css'))) {
  if (!fs.existsSync(path.join(outputDir, 'ui'))) {
    fs.mkdirSync(path.join(outputDir, 'ui'), { recursive: true });
  }
  fs.copyFileSync(
    path.join(srcDir, 'ui', 'sigma-graph-view.css'),
    path.join(outputDir, 'ui', 'sigma-graph-view.css')
  );
  console.log('  Copied: ui/sigma-graph-view.css');
}
if (fs.existsSync(path.join(srcDir, 'utils', 'public_key.pem'))) {
  if (!fs.existsSync(path.join(outputDir, 'utils'))) {
    fs.mkdirSync(path.join(outputDir, 'utils'), { recursive: true });
  }
  fs.copyFileSync(
    path.join(srcDir, 'utils', 'public_key.pem'),
    path.join(outputDir, 'utils', 'public_key.pem')
  );
  console.log('  Copied: utils/public_key.pem');
}

// Step 5: Create minimal package.json (no dependencies needed - all bundled)
const pluginPackageJson = {
  name: 'obsidian-knowledge-graph',
  version: buildConfig.version,
  description: buildConfig.description,
  main: 'main.js'
};
fs.writeFileSync(path.join(outputDir, 'package.json'), JSON.stringify(pluginPackageJson, null, 2));
console.log('✅ Package.json created (minimal - no dependencies needed)');

// Step 6: Create .env file
const envData = {
  PORT: process.env.PORT || '3000',
  DB_PATH: process.env.DB_PATH || './data/knowledge-graph.db'
};
const envContent = ejs.render(envTemplate, envData);
fs.writeFileSync(path.join(outputDir, '.env'), envContent);
console.log('✅ .env file created');

// Step 7: Deploy to Obsidian
console.log('🚀 Deploying to Obsidian...');

// Ensure obsidian plugins directory exists
if (!fs.existsSync(obsidianPluginsDir)) {
  fs.mkdirSync(obsidianPluginsDir, { recursive: true });
}

// Clean up old files except data.json
console.log('🧹 Cleaning up old files in Obsidian plugins directory...');
const filesToKeep = ['data.json'];
if (fs.existsSync(obsidianPluginsDir)) {
  const oldFiles = fs.readdirSync(obsidianPluginsDir);
  for (const file of oldFiles) {
    if (!filesToKeep.includes(file)) {
      const filePath = path.join(obsidianPluginsDir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
        console.log(`  Removed: ${file}`);
      } catch (err) {
        console.warn(`  Warning: Could not remove ${file}:`, err.message);
      }
    }
  }
}

// Copy all files to Obsidian plugins dir
console.log('Copying files to Obsidian plugins directory...');
copyDir(outputDir, obsidianPluginsDir);

// Create data.json if it doesn't exist
const dataJsonPath = path.join(obsidianPluginsDir, 'data.json');
if (!fs.existsSync(dataJsonPath)) {
  fs.writeFileSync(dataJsonPath, JSON.stringify({}));
  console.log('  Created: data.json');
}

console.log('\n✨ Build Complete!');
console.log(`   📍 Output: ${outputDir}`);
console.log(`   🎯 Obsidian: ${obsidianPluginsDir}`);
console.log('   💡 All dependencies bundled into main.js - no node_modules needed!');