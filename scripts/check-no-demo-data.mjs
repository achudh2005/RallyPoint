import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'apps/web/dist/assets');
if (!fs.existsSync(distDir)) {
  console.error(`ERROR: Production bundle directory not found: ${distDir}`);
  process.exit(1);
}

const forbiddenStrings = [
  'Viktor Axelsen',
  'Lee Zii Jia',
  'Kento Momota',
  'Shi Yuqi',
  'Spring 2026 Community League',
  'INITIAL_COMMUNITY_PLAYERS',
  'seedCommunityRankings',
];

const files = fs.readdirSync(distDir).filter((f) => f.endsWith('.js'));
const violations = [];

for (const file of files) {
  const fullPath = path.join(distDir, file);
  const content = fs.readFileSync(fullPath, 'utf8');
  for (const needle of forbiddenStrings) {
    if (content.includes(needle)) {
      violations.push({ file, needle });
    }
  }
}

if (violations.length > 0) {
  console.error('FAILED: Demo/seed data found in production web bundle:');
  for (const v of violations) {
    console.error(`  - "${v.needle}" in ${v.file}`);
  }
  process.exit(1);
}

console.log(`PASS: Scanned ${files.length} production bundle files; 0 demo/seed strings found.`);
