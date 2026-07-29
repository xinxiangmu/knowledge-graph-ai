import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig({
  input: 'src/main.ts',
  output: {
    file: 'dist/main.js',
    format: 'esm',
    sourcemap: true,
    exports: 'named'
  },
  plugins: [
    resolve({
      extensions: ['.ts', '.js']
    }),
    commonjs({
      include: [/node_modules/]
    }),
    typescript({
      tsconfig: './tsconfig.json',
      outputToFilesystem: true
    })
  ]
});
