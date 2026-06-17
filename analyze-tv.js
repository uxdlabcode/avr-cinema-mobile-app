import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputLines = [];
function log(msg = "") {
    console.log(msg);
    outputLines.push(msg);
}

log("=================================================");
log("       AVR Cinema Android TV Compatibility       ");
log("             D-Pad Remote Analyzer               ");
log("=================================================\n");

const srcDir = path.join(__dirname, 'src');
let filesChecked = 0;
let totalInteractive = 0;
let totalFocusable = 0;
let filesWithIssues = 0;

const results = [];

// Exclude list for administrative/desktop-only components that are never loaded on TV
const excludedFilesAndPatterns = [
    'app-sidebar.tsx',
    'nav-main.tsx',
    'nav-projects.tsx',
    'nav-user.tsx',
    'nav-secondary.tsx',
    'nav-documents.tsx',
    'site-header.tsx',
    'team-switcher.tsx',
    'section-cards.tsx',
    'chart-area-interactive.tsx',
    'data-table.tsx',
    'Navbar.tsx', // Mobile/desktop navbar (TV uses TVSidebar)
    'src/components/ui/', // Base UI primitives (checked at usage site instead)
];

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory && f !== 'node_modules' && f !== '.git' && f !== 'dist' && f !== 'assets' && f !== 'store' && f !== 'hooks' && f !== 'lib') {
            walkDir(dirPath, callback);
        } else if (!isDirectory) {
            callback(dirPath);
        }
    });
}

function parseJSXTags(content) {
    const tags = [];
    let i = 0;
    const len = content.length;
    
    while (i < len) {
        if (content[i] === '<' && /[A-Za-z0-9_.-]/.test(content[i + 1])) {
            const startIdx = i;
            i++;
            
            // Extract tag name
            let tagName = "";
            while (i < len && /[A-Za-z0-9_.-]/.test(content[i])) {
                tagName += content[i];
                i++;
            }
            
            // Parse attributes
            let attributes = "";
            let inDoubleQuotes = false;
            let inSingleQuotes = false;
            let inBackticks = false;
            let braceDepth = 0;
            let isSelfClosing = false;
            
            while (i < len) {
                const char = content[i];
                
                if (inDoubleQuotes) {
                    if (char === '"' && content[i - 1] !== '\\') {
                        inDoubleQuotes = false;
                    }
                } else if (inSingleQuotes) {
                    if (char === "'" && content[i - 1] !== '\\') {
                        inSingleQuotes = false;
                    }
                } else if (inBackticks) {
                    if (char === '`' && content[i - 1] !== '\\') {
                        inBackticks = false;
                    }
                } else if (braceDepth > 0) {
                    if (char === '{') {
                        braceDepth++;
                    } else if (char === '}') {
                        braceDepth--;
                    }
                } else {
                    if (char === '"') {
                        inDoubleQuotes = true;
                    } else if (char === "'") {
                        inSingleQuotes = true;
                    } else if (char === '`') {
                        inBackticks = true;
                    } else if (char === '{') {
                        braceDepth = 1;
                    } else if (char === '/' && content[i + 1] === '>') {
                        isSelfClosing = true;
                        i += 2;
                        break;
                    } else if (char === '>') {
                        i++;
                        break;
                    }
                }
                
                attributes += char;
                i++;
            }
            
            tags.push({
                tagName,
                attributes,
                startIdx,
                isSelfClosing
            });
        } else {
            i++;
        }
    }
    return tags;
}

function analyzeFile(filePath) {
    const relativePath = path.relative(__dirname, filePath).replace(/\\/g, '/');
    
    // Check exclusions
    const shouldExclude = excludedFilesAndPatterns.some(pattern => {
        return relativePath.includes(pattern);
    });
    
    if (shouldExclude) {
        return;
    }
    
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx') && !filePath.endsWith('.ts') && !filePath.endsWith('.js')) {
        return;
    }
    
    // Skip skeletons, CSS, layout wrappers that are purely structural or don't have interactive content
    const baseName = path.basename(filePath);
    if (baseName.includes('Skeleton') || baseName.includes('Layout.tsx') || baseName.includes('tvUtils.ts') || baseName === 'routes.tsx' || baseName === 'router.tsx' || baseName === 'main.tsx') {
        return;
    }

    filesChecked++;
    const content = fs.readFileSync(filePath, 'utf8');
    
    const parsedTags = parseJSXTags(content);
    const fileInteractiveElements = [];
    
    parsedTags.forEach(tag => {
        const tagName = tag.tagName;
        const attributes = tag.attributes;
        
        // Skip closing tags starting with / or comments or fragments
        if (tagName.startsWith('/') || tagName === 'Fragment') {
            return;
        }
        
        // Determine if this is an interactive tag that needs to be focusable
        const isKnownInteractiveTag = [
            'button', 'input', 'textarea', 'select', 'a', 
            'Link', 'TabsTrigger', 'Checkbox', 'Button', 
            'CarouselItem', 'EpisodeCard', 'MovieCard', 'Card'
        ].includes(tagName);
        
        const hasClickOrSubmitHandler = 
            attributes.includes('onClick=') || 
            attributes.includes('onKeyDown=') || 
            attributes.includes('onSubmit=');
            
        const isFocusableWrapper = tagName === 'Focusable';
        
        if ((isKnownInteractiveTag || hasClickOrSubmitHandler) && !isFocusableWrapper) {
            // Find line number of the tag
            const lineNumber = content.substring(0, tag.startIdx).split('\n').length;
            
            // Check if it has 'focusable' in className or attributes
            const hasFocusableClass = attributes.includes('focusable');
            
            // Check if the element is disabled or has tabIndex={-1} (which means it's explicitly non-focusable)
            const isDisabled = attributes.includes('disabled=') && !attributes.includes('disabled={false}');
            const isTabDisabled = attributes.includes('tabIndex={-1}') || attributes.includes('tabIndex="-1"');
            
            // Extract a snippet of the tag
            const tagSnippet = `<${tagName}${attributes.substring(0, 80)}${attributes.length > 80 ? '...' : ''}>`;
            
            fileInteractiveElements.push({
                tag: tagName,
                lineNumber,
                snippet: tagSnippet.replace(/\s+/g, ' ').trim(),
                isFocusable: hasFocusableClass || isDisabled || isTabDisabled
            });
        }
    });
    
    const fileInteractiveCount = fileInteractiveElements.length;
    const fileFocusableCount = fileInteractiveElements.filter(e => e.isFocusable).length;
    const missingFocusable = fileInteractiveElements.filter(e => !e.isFocusable);
    
    totalInteractive += fileInteractiveCount;
    totalFocusable += fileFocusableCount;
    
    if (fileInteractiveCount > 0) {
        let status = 'FAIL';
        if (fileFocusableCount === fileInteractiveCount) {
            status = 'PASS';
        } else if (fileFocusableCount > 0) {
            status = 'PARTIAL';
        }
        
        if (status !== 'PASS') {
            filesWithIssues++;
        }
        
        results.push({
            file: relativePath,
            interactiveCount: fileInteractiveCount,
            focusableCount: fileFocusableCount,
            status,
            missing: missingFocusable
        });
    }
}

// Start analysis
walkDir(srcDir, analyzeFile);

// Sort results so FAIL/PARTIAL are at the top, then file paths alphabetically
results.sort((a, b) => {
    if (a.status === b.status) {
        return a.file.localeCompare(b.file);
    }
    const statusOrder = { 'FAIL': 0, 'PARTIAL': 1, 'PASS': 2 };
    return statusOrder[a.status] - statusOrder[b.status];
});

log("--------------------------------------------------------------------------------------------------");
log(`${"File Path".padEnd(50)} | Interactive | Focusable | Status`);
log("--------------------------------------------------------------------------------------------------");
results.forEach(r => {
    const statusColor = r.status === 'PASS' ? '✅ PASS' : (r.status === 'PARTIAL' ? '⚠️  PARTIAL' : '❌ FAIL');
    log(`${r.file.padEnd(50)} | ${String(r.interactiveCount).padStart(11)} | ${String(r.focusableCount).padStart(9)} | ${statusColor}`);
});
log("--------------------------------------------------------------------------------------------------");

log("\n=================================================");
log("                 Summary Report                  ");
log("=================================================");
log(`Total Files Checked:      ${filesChecked}`);
log(`Files with TV Support:    ${results.filter(r => r.status === 'PASS').length} / ${results.length}`);
log(`Files with Issues:        ${filesWithIssues}`);
log(`Total Interactive Items:  ${totalInteractive}`);
log(`Total Focusable Items:    ${totalFocusable}`);
const overallCoverage = totalInteractive > 0 ? ((totalFocusable / totalInteractive) * 100).toFixed(1) : 100;
log(`Overall TV D-Pad Coverage: ${overallCoverage}%`);
log("=================================================");

if (filesWithIssues > 0) {
    log("\n❌ Gaps identified in D-pad remote support. Details by file:\n");
    results.forEach(r => {
        if (r.status !== 'PASS') {
            log(`📁 File: ${r.file} (${r.status})`);
            r.missing.forEach(m => {
                log(`   Line ${m.lineNumber}: ${m.snippet}`);
            });
            log();
        }
    });
} else {
    log("\n✅ 100% Android TV D-Pad Remote Compatibility Achieved! All interactive elements are focusable.");
}

// Write file
fs.writeFileSync(path.join(__dirname, 'tv_report.md'), outputLines.join('\n'), 'utf8');

if (filesWithIssues > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
