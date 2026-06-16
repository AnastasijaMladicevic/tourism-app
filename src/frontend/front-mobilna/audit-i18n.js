const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'src', 'app');
const I18N_DIR = path.join(__dirname, 'src', 'assets', 'i18n');

function walk(dir, exts, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, files);
    else if (exts.includes(path.extname(entry.name))) files.push(full);
  }
  return files;
}

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

const sr = flatten(JSON.parse(fs.readFileSync(path.join(I18N_DIR, 'sr.json'), 'utf8')));
const en = flatten(JSON.parse(fs.readFileSync(path.join(I18N_DIR, 'en.json'), 'utf8')));
const es = flatten(JSON.parse(fs.readFileSync(path.join(I18N_DIR, 'es.json'), 'utf8')));
const it = flatten(JSON.parse(fs.readFileSync(path.join(I18N_DIR, 'it.json'), 'utf8')));

const srKeys = new Set(Object.keys(sr));

const files = walk(ROOT, ['.ts', '.html']);

// usages: key -> [{file, line, raw}]
const usages = new Map();
const dynamicUsages = [];

const staticKeyRe = /(?:\.translate|translate|translateService\.instant|\.instant)\s*\(\s*['"]([^'"]+)['"]/g;
const pipeRe = /['"]([^'"]+)['"]\s*\|\s*translate/g;
// dynamic patterns: template literal with backtick containing translate(
const dynamicTemplateRe = /translate\(\s*`([^`]*)`/g;
// concatenation pattern e.g. translate('foo.' + x) or `foo.${x}`
const dynamicConcatRe = /translate\(\s*(['"][^'"]*['"]\s*\+\s*[^)]*)\)/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(__dirname, file).replace(/\\/g, '/');
  const lines = content.split('\n');

  for (const [re, label] of [[staticKeyRe, 'static'], [pipeRe, 'pipe']]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content))) {
      const key = m[1];
      // skip if it looks like a path/url or has interpolation markers
      if (key.includes('${') || key.includes('{{')) continue;
      const lineNo = content.slice(0, m.index).split('\n').length;
      if (!usages.has(key)) usages.set(key, []);
      usages.get(key).push({ file: rel, line: lineNo });
    }
  }

  // dynamic: backtick template literals in translate()
  let m;
  dynamicTemplateRe.lastIndex = 0;
  while ((m = dynamicTemplateRe.exec(content))) {
    const lineNo = content.slice(0, m.index).split('\n').length;
    dynamicUsages.push({ file: rel, line: lineNo, pattern: m[0], type: 'template-literal' });
  }
  dynamicConcatRe.lastIndex = 0;
  while ((m = dynamicConcatRe.exec(content))) {
    const lineNo = content.slice(0, m.index).split('\n').length;
    dynamicUsages.push({ file: rel, line: lineNo, pattern: m[0], type: 'concat' });
  }

  // pipe with ternary/concat or template literal in html: [key]: `...${x}...` | translate or (cond ? 'a' : 'b') | translate
  const dynamicPipeRe = /\)\s*\|\s*translate|`[^`]*\$\{[^`]*\}[^`]*`\s*\|\s*translate/g;
  dynamicPipeRe.lastIndex = 0;
  while ((m = dynamicPipeRe.exec(content))) {
    const lineNo = content.slice(0, m.index).split('\n').length;
    // try to grab some context
    const lineText = lines[lineNo - 1] ? lines[lineNo - 1].trim() : '';
    dynamicUsages.push({ file: rel, line: lineNo, pattern: lineText.slice(0, 120), type: 'pipe-dynamic' });
  }
}

// Check missing keys
const missing = [];
for (const [key, locs] of usages) {
  if (!srKeys.has(key)) {
    missing.push({ key, locs });
  }
}

console.log('=== MISSING KEYS (used but not in sr.json) ===');
console.log(`Total distinct missing keys: ${missing.length}`);
for (const { key, locs } of missing) {
  console.log(`\nKEY: ${key}`);
  for (const l of locs.slice(0, 2)) console.log(`  ${l.file}:${l.line}`);
}

console.log('\n\n=== DYNAMIC USAGES (need manual review) ===');
console.log(`Total: ${dynamicUsages.length}`);
for (const d of dynamicUsages) {
  console.log(`${d.file}:${d.line} [${d.type}] ${d.pattern}`);
}

// Cross-locale check
const missingInOther = { en: [], es: [], it: [] };
for (const key of usages.keys()) {
  if (!srKeys.has(key)) continue;
  if (!(key in en)) missingInOther.en.push(key);
  if (!(key in es)) missingInOther.es.push(key);
  if (!(key in it)) missingInOther.it.push(key);
}

console.log('\n\n=== KEYS USED, IN sr.json, BUT MISSING IN OTHER LOCALES ===');
for (const lang of ['en', 'es', 'it']) {
  console.log(`${lang}: ${missingInOther[lang].length} missing`);
  console.log(missingInOther[lang].slice(0, 15).join(', '));
}

// Save full key list for fuzzy matching
fs.writeFileSync(path.join(__dirname, '_sr_keys.json'), JSON.stringify(Object.keys(sr).sort(), null, 2));
fs.writeFileSync(path.join(__dirname, '_missing_keys.json'), JSON.stringify(missing.map(m => ({key: m.key, locs: m.locs})), null, 2));
