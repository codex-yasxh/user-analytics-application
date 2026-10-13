import fs from 'node:fs';
import path from 'node:path';

const rawApiUrl = process.env.VITE_API_URL || 'http://localhost:4000';
const apiUrl = rawApiUrl.endsWith('/api/events')
  ? rawApiUrl
  : `${rawApiUrl.replace(/\/$/, '')}/api/events`;

const srcDir = path.resolve(process.cwd(), 'demo');
const destDir = path.resolve(process.cwd(), 'dashboard', 'public', 'demo');

fs.mkdirSync(destDir, { recursive: true });

const files = fs.readdirSync(srcDir);
for (const file of files) {
  const srcFile = path.join(srcDir, file);
  const destFile = path.join(destDir, file);
  const stat = fs.statSync(srcFile);

  if (stat.isFile()) {
    let content = fs.readFileSync(srcFile, 'utf8');
    content = content.replace(/__API_URL__/g, apiUrl);
    fs.writeFileSync(destFile, content, 'utf8');
  }
}
