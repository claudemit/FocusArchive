import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'dist');
const allowedExtensions = new Set(['.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.woff', '.woff2']);
const errors = [];
const warnings = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}
function check(pattern, content, label, relative) {
  pattern.lastIndex = 0;
  if (pattern.test(content)) errors.push(`${relative}: ${label}`);
}

if (!fs.existsSync(path.join(root, 'index.html'))) errors.push('index.html is missing from the artifact root');
const files = fs.existsSync(root) ? walk(root) : [];
const htmlFiles = files.filter((file) => path.extname(file).toLowerCase() === '.html');
if (htmlFiles.length !== 1 || path.basename(htmlFiles[0] || '').toLowerCase() !== 'index.html') errors.push('artifact must contain exactly one HTML file named index.html at root');

for (const file of files) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const extension = path.extname(file).toLowerCase();
  if (!allowedExtensions.has(extension)) { errors.push(`${relative}: unsupported file type ${extension || '(none)'}`); continue; }
  if (!['.html', '.css', '.js', '.json', '.svg'].includes(extension)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const base64Pattern = /data:[^;,\s]+;base64,([A-Za-z0-9+/=]+)/g;
  for (const match of content.matchAll(base64Pattern)) {
    const bytes = Math.floor(match[1].replace(/=/g, '').length * 3 / 4);
    if (bytes > 1024 * 1024) errors.push(`${relative}: embedded Base64 exceeds 1 MiB`);
    else if (bytes > 100 * 1024) warnings.push(`${relative}: embedded Base64 exceeds 100 KiB`);
  }
  if (extension === '.html') {
    check(/^(?!\s*<!doctype\s+html>)/i, content, 'HTML5 doctype must be the first declaration', relative);
    check(/<html\b(?![^>]*\blang\s*=\s*["']zh-CN["'])/i, content, 'html lang must be zh-CN', relative);
    if (!/<meta\b[^>]*\bname\s*=\s*["']viewport["'][^>]*>/i.test(content) || !/width=device-width/i.test(content) || !/initial-scale=1(?:\.0)?/i.test(content) || !/viewport-fit=cover/i.test(content)) errors.push(`${relative}: viewport must include width=device-width, initial-scale=1.0, and viewport-fit=cover`);
    check(/<script\b(?![^>]*\bsrc\s*=)[^>]*>/i, content, 'inline script is forbidden', relative);
    check(/\son[a-z]+\s*=/i, content, 'inline event handler is forbidden', relative);
    check(/<script\b[^>]*\btype\s*=\s*["']module["']/i, content, 'module script is forbidden', relative);
    check(/<(?:base|iframe|object)\b/i, content, 'base/iframe/object is forbidden', relative);
    check(/<meta\b[^>]*\bhttp-equiv\s*=\s*["']Content-Security-Policy["']/i, content, 'container owns CSP; do not add a CSP meta tag', relative);
    check(/<a\b[^>]*(?:\bdownload\b|\btarget\s*=\s*["']_blank["'])/i, content, 'download or new-window link is forbidden', relative);
    check(/(?:src|href)\s*=\s*["'](?:https?:|\/\/|\/)/i, content, 'resource URL must be package-relative', relative);
    check(/(?:href|src)\s*=\s*["']javascript:/i, content, 'javascript: URI is forbidden', relative);
    check(/<(?:video|audio|source)\b[^>]*\bsrc\s*=\s*["'](?:data:|blob:)/i, content, 'data/blob media source is forbidden', relative);
    const referencePattern = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
    for (const match of content.matchAll(referencePattern)) {
      const reference = match[1];
      if (/^(?:data:|blob:|#)/i.test(reference)) continue;
      const target = path.resolve(path.dirname(file), reference.split(/[?#]/)[0]);
      if (target !== root && !target.startsWith(root + path.sep)) errors.push(`${relative}: resource escapes artifact root: ${reference}`);
      else if (!fs.existsSync(target)) errors.push(`${relative}: referenced resource is missing: ${reference}`);
    }
  }
  if (extension === '.css' || extension === '.html') {
    check(/url\(\s*["']?(?:https?:|\/\/|\/)/i, content, 'CSS URL must be package-relative', relative);
    check(/@import\s+(?:url\(\s*)?["']?(?:https?:|\/\/)/i, content, 'external CSS import is forbidden', relative);
  }
  if (extension === '.js') {
    const banned = [
      [/\bfetch\s*\(/, 'network fetch is forbidden'], [/\bXMLHttpRequest\b/, 'XMLHttpRequest is forbidden'],
      [/\bnew\s+(?:WebSocket|EventSource|RTCPeerConnection)\s*\(/, 'realtime networking is forbidden'], [/\bnew\s+(?:Worker|SharedWorker)\s*\(/, 'workers are forbidden'],
      [/\bnavigator\.(?:geolocation|clipboard|bluetooth|usb|hid|serial|serviceWorker|credentials|locks)\b/, 'disabled navigator capability is referenced'],
      [/\bWebAssembly\b/, 'WebAssembly is forbidden'], [/\beval\s*\(|\bnew\s+Function\s*\(/, 'dynamic code execution is forbidden'],
      [/\bwindow\.open\s*\(|\bwindow\.prompt\s*\(/, 'new windows/prompt are forbidden'], [/\b(?:import|export)\s+(?:[\w*{]|default\b)/, 'ES modules are forbidden in delivery scripts'],
      [/\blocation\.(?:href\s*=|assign\s*\()/, 'location navigation is forbidden'], [/\?\.(?!\d)|\?\?|&&=|\|\|=|\?\?=|\bfor\s+await\b/, 'syntax newer than the ES2017 delivery baseline is referenced'],
    ];
    for (const [pattern, label] of banned) check(pattern, content, label, relative);
    if (relative !== 'assets/platform/xhs-minitool.js' && /\b(?:window\.)?xhs\.miniTool\b/.test(content)) errors.push(`${relative}: direct miniTool Bridge access must stay behind the platform adapter`);
  }
}
for (const warning of warnings) process.stderr.write(`WARN ${warning}\n`);
if (errors.length) { for (const error of errors) process.stderr.write(`ERROR ${error}\n`); process.exit(1); }
process.stdout.write(`Static gates PASS (${files.length} files)\n`);
