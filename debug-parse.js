import fs from 'fs';
import path from 'path';

const file = 'src/pages/HomePage/HomePage.tsx';
const content = fs.readFileSync(file, 'utf8');

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

const tags = parseJSXTags(content);
const line587 = tags.find(t => {
    const line = content.substring(0, t.startIdx).split('\n').length;
    return line === 587;
});

if (line587) {
    console.log("Found tag at line 587:");
    console.log("TagName:", line587.tagName);
    console.log("Attributes length:", line587.attributes.length);
    console.log("Attributes:", JSON.stringify(line587.attributes));
    console.log("Contains 'focusable'?", line587.attributes.includes('focusable'));
} else {
    console.log("Could not find tag at line 587.");
    const tagNear = tags.filter(t => {
        const line = content.substring(0, t.startIdx).split('\n').length;
        return line >= 585 && line <= 590;
    });
    console.log("Tags near 587:");
    tagNear.forEach(t => {
        const line = content.substring(0, t.startIdx).split('\n').length;
        console.log(`Line ${line}: <${t.tagName}...>`);
    });
}
