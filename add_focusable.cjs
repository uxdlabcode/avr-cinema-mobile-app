const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
    });
}

const targetTags = ['button', 'Link', 'input', 'textarea', 'select'];

walk('./src', (filePath) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    targetTags.forEach(tag => {
        const tagRegex = new RegExp(`<${tag}(?:\\s+[^>]*?)?>`, 'g');
        
        content = content.replace(tagRegex, (match) => {
            if (match.includes('focusable')) return match;
            // Ignore if it's a self-closing tag without attributes like <button/> but allow it if matched.
            
            if (match.match(/className=(["'])(.*?)\1/)) {
                return match.replace(/className=(["'])(.*?)\1/, `className=$1focusable $2$1`);
            }
            else if (match.match(/className=\{([^}]+)\}/)) {
                if (match.match(/className=\{\s*`([^`]*)`\s*\}/)) {
                     return match.replace(/className=\{\s*`([^`]*)`\s*\}/, `className={\`focusable $1\`}`);
                }
                return match.replace(/className=\{([^}]+)\}/, `className={"focusable " + ($1)}`);
            }
            else {
                return match.replace(`<${tag}`, `<${tag} className="focusable"`);
            }
        });
    });

    const onClickRegex = /<(div|a|span|li|img)(?=\s)([^>]*?onClick=[^>]*?)>/g;
    content = content.replace(onClickRegex, (match, tag, rest) => {
        if (match.includes('focusable')) return match;
        
        if (match.match(/className=(["'])(.*?)\1/)) {
            return match.replace(/className=(["'])(.*?)\1/, `className=$1focusable $2$1`);
        }
        else if (match.match(/className=\{([^}]+)\}/)) {
            if (match.match(/className=\{\s*`([^`]*)`\s*\}/)) {
                 return match.replace(/className=\{\s*`([^`]*)`\s*\}/, `className={\`focusable $1\`}`);
            }
            return match.replace(/className=\{([^}]+)\}/, `className={"focusable " + ($1)}`);
        }
        else {
            return match.replace(`<${tag}`, `<${tag} className="focusable"`);
        }
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
});
