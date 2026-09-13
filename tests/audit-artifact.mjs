#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const MIB = 1024 * 1024;
const ZIP_LIMIT = 10 * MIB;
const ZIP_RECOMMENDED = 2 * MIB;
const TEXT_FILE_WARNING = 2 * MIB;
const TEXT_TOTAL_WARNING = 5 * MIB;
const TEXT_SUFFIXES = new Set(['.html', '.css', '.js', '.json']);
const formatSize = (size) => `${(size / MIB).toFixed(2)} MiB`;

function walkDirectory(root) {
  const files = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) walk(target);
      else if (entry.isFile()) files.push(target);
    }
  }
  walk(root);
  return files;
}
function auditDirectory(root) {
  const warnings = [];
  const files = walkDirectory(root);
  let textTotal = 0;
  for (const file of files) {
    if (!TEXT_SUFFIXES.has(path.extname(file).toLowerCase())) continue;
    const size = fs.statSync(file).size;
    const name = path.relative(root, file).split(path.sep).join('/');
    textTotal += size;
    if (size > TEXT_FILE_WARNING) warnings.push(`${name}: text file is ${formatSize(size)}; review parse and memory cost`);
  }
  if (textTotal > TEXT_TOTAL_WARNING) warnings.push(`uncompressed HTML/CSS/JS/JSON total is ${formatSize(textTotal)}; review for embedded databases or generated content`);
  return { errors: [], warnings, count: files.length };
}
function auditZipSize(file) {
  const size = fs.statSync(file).size;
  const errors = size > ZIP_LIMIT ? [`${path.basename(file)}: zip is ${formatSize(size)}; hard limit is 10 MiB`] : [];
  const warnings = size > ZIP_RECOMMENDED && !errors.length ? [`${path.basename(file)}: zip is ${formatSize(size)}; recommended target is 2 MiB`] : [];
  return { errors, warnings, count: 1, note: 'ZIP contents are checked before packaging by static-gates.mjs.' };
}
const target = process.argv[2];
if (!target) { console.error('Usage: node audit-artifact.mjs <artifact-directory-or-zip>'); process.exit(2); }
const resolved = path.resolve(target);
if (!fs.existsSync(resolved)) { console.error(`ERROR: path not found: ${resolved}`); process.exit(2); }
const result = fs.statSync(resolved).isDirectory() ? auditDirectory(resolved) : auditZipSize(resolved);
for (const message of result.errors) console.log(`ERROR: ${message}`);
for (const message of result.warnings) console.log(`WARN: ${message}`);
if (result.note) console.log(`NOTE: ${result.note}`);
console.log(result.errors.length ? `FAILED: ${result.errors.length} error(s), ${result.warnings.length} warning(s)` : `PASS: ${result.count} file(s), ${result.warnings.length} warning(s)`);
process.exitCode = result.errors.length ? 1 : 0;
