// fix-duplicate-classname.js
// This script scans the src directory for .tsx files and merges duplicate className attributes.
// It handles simple static string className values.
const fs = require('fs');
const path = require('path');
const glob = require('glob');

function mergeClassNames(content) {
  // Replace duplicate className attributes on the same element.
  // Handles variations with whitespace and newlines between them.
  const regex = /className="([^"]*)"\s+className="([^"]*)"/g;
  return content.replace(regex, (_, a, b) => {
    // Combine and dedupe class names
    const classes = (a + ' ' + b).trim().split(/\s+/);
    const unique = [...new Set(classes)];
    return `className="${unique.join(' ')}"`;
  });
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const updated = mergeClassNames(original);
  if (original !== updated) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`Fixed duplicates in ${filePath}`);
  }
}

function main() {
  const pattern = path.join('src', '**', '*.tsx');
  const files = glob.sync(pattern, { nodir: true });
  files.forEach(processFile);
  console.log('Duplicate className fixing completed.');
}

main();
