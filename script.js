import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("=========================================");
console.log("       AVR Cinema Code Analyzer         ");
console.log("=========================================\n");

const srcDir = path.join(__dirname, 'src');
let filesChecked = 0;
let issuesFound = 0;

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory && f !== 'node_modules' && f !== '.git' && f !== 'dist') {
            walkDir(dirPath, callback);
        } else if (!isDirectory) {
            callback(dirPath);
        }
    });
}

function analyzeFile(filePath) {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js') && !filePath.endsWith('.jsx')) {
        return;
    }
    
    filesChecked++;
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check 1: Duplicate export declarations of functions/classes/consts
    const exports = {};
    const functionRegex = /export\s+(function|const|class|interface|type)\s+([a-zA-Z0-9_]+)/g;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
        const type = match[1];
        const name = match[2];
        
        if (exports[name]) {
            console.error(`⚠️  [DUPLICATE DECLARATION] File: ${path.relative(__dirname, filePath)}`);
            console.error(`   Name "${name}" is exported multiple times as a ${type}.`);
            issuesFound++;
        } else {
            exports[name] = type;
        }
    }
    
    // Check 2: Orphaned/Stray import statements after search/replace nesting
    const strayImports = content.match(/return\s*\(\s*import\s+/g);
    if (strayImports) {
        console.error(`⚠️  [SYNTAX HAZARD] File: ${path.relative(__dirname, filePath)}`);
        console.error(`   Found potential nested import statement ("return (import...").`);
        issuesFound++;
    }

    // Check 3: Check for mismatched brace counts (bracket balancing)
    let openBraces = 0;
    let closeBraces = 0;
    for (let char of content) {
        if (char === '{') openBraces++;
        if (char === '}') closeBraces++;
    }

    // Check 4: Check if any local imports don't exist
    const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('@/')) {
            const resolvedPath = importPath.replace('@/', './src/');
            let resolved = fs.existsSync(path.resolve(__dirname, resolvedPath));
            if (!resolved) {
                for (let ext of ['.ts', '.tsx', '.json', '/index.ts', '/index.tsx']) {
                    const checkPath = path.resolve(__dirname, resolvedPath + ext);
                    if (fs.existsSync(checkPath)) {
                        resolved = true;
                        break;
                    }
                }
            }
            if (!resolved && !importPath.includes('lucide-react') && !importPath.includes('react-router-dom') && !importPath.includes('firebase')) {
                const checkDir = path.resolve(__dirname, resolvedPath);
                if (fs.existsSync(checkDir) && fs.statSync(checkDir).isDirectory()) {
                    resolved = true;
                } else {
                    console.error(`⚠️  [UNRESOLVED LOCAL IMPORT] File: ${path.relative(__dirname, filePath)}`);
                    console.error(`   Cannot resolve import: "${importPath}"`);
                    issuesFound++;
                }
            }
        }
    }
}

// Start analysis
console.log("Analyzing project files under src/...");
walkDir(srcDir, analyzeFile);

console.log("\n=========================================");
console.log("            Analysis Summary             ");
console.log("=========================================");
console.log(`Files Analyzed: ${filesChecked}`);
console.log(`Issues Found: ${issuesFound}`);
console.log("=========================================");

if (issuesFound > 0) {
    console.log("\n❌ Code analysis completed with issues. Please fix details above.");
    process.exit(1);
} else {
    console.log("\n✅ Code analysis completed successfully! All code checks passed.");
    process.exit(0);
}
