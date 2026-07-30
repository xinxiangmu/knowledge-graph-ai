import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const mainRelease = path.join(repoRoot, 'plugin', 'scripts', 'release.mjs');

console.log('↳ Redirecting to canonical release script...\n');
execSync(`node "${mainRelease}"`, { stdio: 'inherit', cwd: repoRoot });