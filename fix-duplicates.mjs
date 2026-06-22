// fix-duplicates.mjs
// Fixes TS17001: JSX elements cannot have multiple attributes with the same name.
// Pattern: className="focusable" followed (possibly across newlines) by className="..." or className={`...`}
// Merges them into a single className by prepending "focusable " to the second one.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const SRC_DIR = './src';

function getAllTsxFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...getAllTsxFiles(fullPath));
    } else if (extname(entry) === '.tsx' || extname(entry) === '.ts') {
      results.push(fullPath);
    }
  }
  return results;
}

function fixFile(filePath) {
  const original = readFileSync(filePath, 'utf8');
  let content = original;

  // Pattern 1: className="focusable" [whitespace/newlines/other-attrs] className="VALUE"
  // We need to handle the case where className="focusable" is the FIRST attr,
  // and there's another className="..." later on the same element.
  // 
  // The simplest reliable approach: replace
  //   className="focusable"\s+  followed by  className="VALUE"
  // with className="focusable VALUE"
  //
  // Also handle:
  //   className="focusable"\s+  followed by  className={`VALUE`}
  // with className={`focusable VALUE`}

  // Case 1: className="focusable" ... className="STATIC_VALUE"
  // Using a regex that captures optional whitespace/newlines between the two classNames
  // Note: there may be other attributes between them (tabIndex, onClick, etc.)
  // We need a greedy-careful approach.
  
  // Strategy: Find all occurrences of className="focusable" where on the same JSX element
  // (before the closing > or />) there is another className attribute.
  // We'll do multiple passes for different patterns.

  // Simple approach: direct adjacent replacement (with possible whitespace between)
  // This catches the most common pattern from the error list.

  // Pattern: className="focusable"\n            tabIndex={...}\n            onClick={...}\n            className="..."
  // We'll use a state-machine approach: scan for className="focusable" then scan forward
  // to find the next className= before a tag close.

  let changed = false;

  // We'll process line by line grouping into JSX "elements"
  // More robust: use regex with dotall flag

  // Approach: Replace className="focusable" + (anything not containing >) + className="..."
  // The tricky part is not crossing element boundaries (i.e., not matching across >)
  
  // Since JSX attribute values can span lines but > closes a tag, we look for
  // className="focusable" followed by className on the same tag (before >)

  // We'll do this by finding the pattern and replacing inline
  // Using a non-greedy match that doesn't cross unbalanced > characters

  // For static string classNames: className="focusable" ... className="VALUE"
  // Regex: className="focusable"([^>]*?)className="([^"]*)"
  // This works as long as there's no > between them (which there shouldn't be in JSX attributes)
  
  const staticRegex = /className="focusable"(\s[^>]*?)className="([^"]*)"/gs;
  content = content.replace(staticRegex, (match, between, value) => {
    changed = true;
    return `className="focusable ${value}"${between.replace(/\s*$/, '')}`.replace(
      `className="focusable ${value}"`,
      `className="focusable ${value}"`
    );
    // Actually, we need to reconstruct: replace the first className="focusable" and keep "between" minus the second className
    // Let's be more careful:
  });

  // Reset and redo with proper reconstruction
  content = original;
  changed = false;

  // Better approach: replace the FIRST className="focusable" with nothing, 
  // and prepend "focusable " to the second className value.

  // For static: className="focusable"\s*(other attrs)\s*className="VALUE"
  // -> (other attrs) className="focusable VALUE"
  const staticRe = /className="focusable"((?:\s+(?!className)[^\s>][^\s>]*(?:=(?:"[^"]*"|'[^']*'|\{[^}]*\}))?)*\s+)className="([^"]*)"/gs;
  
  // This is getting complex. Let's use a simpler targeted approach:
  // Find className="focusable" then find the very next className= on the same tag
  
  function processContent(text) {
    // We'll process the text character by character tracking state
    let result = '';
    let i = 0;
    let replacements = 0;
    
    while (i < text.length) {
      // Look for className="focusable"
      const marker = 'className="focusable"';
      const idx = text.indexOf(marker, i);
      if (idx === -1) {
        result += text.slice(i);
        break;
      }
      
      // Copy everything up to the marker
      result += text.slice(i, idx);
      i = idx + marker.length;
      
      // Now scan forward to find the next className= 
      // but stop if we hit a closing > that ends the JSX open tag
      // (we need to be careful about > inside attribute values)
      
      let j = i;
      let depth = 0; // track { } braces
      let inString = false;
      let stringChar = '';
      let foundClassName = -1;
      let tagClosed = false;
      
      while (j < text.length) {
        const ch = text[j];
        
        if (inString) {
          if (ch === '\\') { j += 2; continue; }
          if (ch === stringChar) inString = false;
          j++;
          continue;
        }
        
        if (depth > 0) {
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
          j++;
          continue;
        }
        
        if (ch === '"' || ch === "'") {
          inString = true;
          stringChar = ch;
          j++;
          continue;
        }
        
        if (ch === '{') { depth++; j++; continue; }
        
        // Check if this is the closing > of the JSX tag
        if (ch === '>' || (ch === '/' && text[j+1] === '>')) {
          tagClosed = true;
          break;
        }
        
        // Check for className=
        if (text.slice(j, j + 10) === 'className=') {
          foundClassName = j;
          break;
        }
        
        j++;
      }
      
      if (!tagClosed && foundClassName !== -1) {
        // We found another className= before the tag closes
        // The text between is text.slice(i, foundClassName)
        const between = text.slice(i, foundClassName);
        
        // Now parse the second className value
        let afterClassNameEq = foundClassName + 10; // skip 'className='
        const nextChar = text[afterClassNameEq];
        
        if (nextChar === '"') {
          // Static string: className="VALUE"
          const closeQuote = text.indexOf('"', afterClassNameEq + 1);
          const value = text.slice(afterClassNameEq + 1, closeQuote);
          const newClassName = `className="focusable ${value}"`;
          result += between + newClassName;
          i = closeQuote + 1;
          replacements++;
        } else if (nextChar === '{' && text[afterClassNameEq + 1] === '`') {
          // Template literal: className={`VALUE`}
          // Find the closing `}
          let k = afterClassNameEq + 2;
          while (k < text.length) {
            if (text[k] === '`' && text[k+1] === '}') {
              break;
            }
            k++;
          }
          const value = text.slice(afterClassNameEq + 2, k);
          const newClassName = `className={\`focusable ${value}\`}`;
          result += between + newClassName;
          i = k + 2; // skip `}
          replacements++;
        } else if (nextChar === '{') {
          // Expression className={expr} - just keep as is, prepend focusable via cn()
          // For now, handle simple {`...`} - already handled above
          // For other expressions, we'll skip and keep original marker
          result += marker + between + 'className=';
          i = foundClassName + 10;
        } else {
          // Unknown format, keep original
          result += marker;
          // i stays where it is (after marker)
        }
      } else {
        // No second className found, keep the original marker
        result += marker;
        // i stays (already advanced past marker)
      }
    }
    
    return { result, replacements };
  }
  
  const { result, replacements } = processContent(original);
  
  if (replacements > 0) {
    writeFileSync(filePath, result, 'utf8');
    console.log(`Fixed ${replacements} duplicate(s) in ${filePath}`);
  }
  
  return replacements;
}

const files = getAllTsxFiles(SRC_DIR);
let totalFixed = 0;
let totalFiles = 0;

for (const file of files) {
  const count = fixFile(file);
  if (count > 0) {
    totalFixed += count;
    totalFiles++;
  }
}

console.log(`\nDone. Fixed ${totalFixed} duplicates across ${totalFiles} files.`);
