// One-shot codemod: removes unused identifiers from import statements based on
// ESLint JSON output. Non-import unused vars are reported, not touched.
// Usage: npx eslint . -f json > lint.json && node scripts/codemod-unused.mjs
import { readFileSync, writeFileSync } from 'fs';

const results = JSON.parse(readFileSync('lint.json', 'utf8'));
let removed = 0;
const skipped = [];

for (const file of results) {
  const msgs = file.messages.filter(
    (m) => m.ruleId === 'no-unused-vars' && /'([^']+)' is defined but never used/.test(m.message)
  );
  if (!msgs.length) continue;

  let text = readFileSync(file.filePath, 'utf8');
  const lines = text.split('\n');

  // Process from last message to first within each line range to keep positions sane;
  // we work line-based so ordering doesn't matter much, but dedupe names per line.
  for (const m of msgs.sort((a, b) => b.line - a.line)) {
    const name = m.message.match(/'([^']+)' is defined but never used/)[1];
    const lineIdx = m.line - 1;
    const line = lines[lineIdx];
    if (!line || !line.trimStart().startsWith('import')) {
      skipped.push(`${file.filePath}:${m.line} ${name} (not an import line)`);
      continue;
    }
    let updated = line;
    // Named import forms
    updated = updated.replace(new RegExp(`\\b${name},\\s*`, 'g'), '');
    updated = updated.replace(new RegExp(`,\\s*\\b${name}\\b(?!:)`, 'g'), '');
    updated = updated.replace(new RegExp(`\\{\\s*\\b${name}\\b\\s*\\}`, 'g'), '{}');
    // Default-only import: import name from 'x'
    updated = updated.replace(new RegExp(`^\\s*import ${name} from ['"][^'"]+['"];?\\s*$`), '');
    // Empty namespace cleanup: import {} from 'x'
    updated = updated.replace(/^(\s*)import\s*\{\s*\}\s*from\s*(['"]).*\2;?\s*$/, '');

    if (updated !== line) {
      lines[lineIdx] = updated;
      removed++;
    } else {
      skipped.push(`${file.filePath}:${m.line} ${name} (pattern unmatched)`);
    }
  }

  const out = lines
    .filter((l, i) => !(l.trim() === '' && /^\s*(import|from)/.test(lines[i - 1] || '') === false && l === '' && false))
    .join('\n');
  // Collapse accidental double blank lines introduced by removals
  writeFileSync(file.filePath, out.replace(/\n{3,}/g, '\n\n'));
}

console.log(`Removed ${removed} unused import identifiers.`);
if (skipped.length) {
  console.log('Skipped (manual review needed):');
  for (const s of skipped) console.log('  ' + s);
}
