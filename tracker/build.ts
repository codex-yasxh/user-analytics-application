import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import * as esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outfile = resolve(__dirname, '../dashboard/public/cf.js');

mkdirSync(dirname(outfile), { recursive: true });

await esbuild.build({
  entryPoints: [resolve(__dirname, 'src/index.ts')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2018',
  outfile,
});

const content = readFileSync(outfile);
const rawSize = statSync(outfile).size;
const gzipSize = gzipSync(content).length;

process.stdout.write(
  `Tracker build: ${outfile} (${rawSize} bytes, gzip: ${gzipSize} bytes)\n`,
);
