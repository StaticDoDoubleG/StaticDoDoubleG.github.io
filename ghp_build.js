const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, 'docs');

function buildTree(dirPath) {
    const items = [];
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        const relPath = path.relative(docsDir, fullPath).replace(/\\/g, '/');

        if (stat.isDirectory()) {
            items.push({
                type: 'folder',
                name: file,
                path: relPath,
                children: buildTree(fullPath)
            });
        } else if (file.toLowerCase().endsWith('.md')) {
            let thumbnail = null;
            let excerpt = '';
            let mdTitle = null;
            let mdAuthor = null;
            let mdDate = null;
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                
                // Extract frontmatter
                const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
                if (fmMatch) {
                    const fm = fmMatch[1];
                    const authorMatch = fm.match(/^author:\s*(.+)$/m);
                    if (authorMatch) mdAuthor = authorMatch[1].trim();
                    const dateMatch = fm.match(/^date:\s*(.+)$/m);
                    if (dateMatch) mdDate = dateMatch[1].trim();
                }

                const titleMatch = content.match(/^#\s+(.+)$/m);
                if (titleMatch) {
                    mdTitle = titleMatch[1].trim();
                }
                const imgMatch = content.match(/!\[.*?\]\((.*?)\)|<img[^>]+src=["']([^"']+)["']/i);
                if (imgMatch) {
                    thumbnail = imgMatch[1] || imgMatch[2];
                }
                let normalizedContent = content.replace(/\r\n/g, '\n');
                let plainText = normalizedContent.replace(/^---\n[\s\S]*?\n---\n*/, '');
                plainText = plainText.replace(/^#\s+.+\n*/, '');
                plainText = plainText
                    .replace(/!\[.*?\]\(.*?\)/g, '')
                    .replace(/<[^>]*>?/gm, '')
                    .replace(/[#*`_~]/g, '')
                    .replace(/\n+/g, ' ')
                    .trim();
                excerpt = plainText.substring(0, 120);
                if (plainText.length > 120) excerpt += '...';
            } catch (e) {
                // Ignore errors
            }
            const date = stat.mtime.toISOString().split('T')[0];

            items.push({
                type: 'file',
                name: file.replace(/\.md$/i, ''),
                path: relPath,
                title: mdTitle,
                author: mdAuthor,
                thumbnail: thumbnail,
                excerpt: excerpt,
                date: mdDate || date
            });
        }
    }

    // Sort: folders first, then files alphabetically
    items.sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });

    return items;
}

function buildSearchIndex(dirPath) {
    let index = [];
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        const relPath = path.relative(docsDir, fullPath).replace(/\\/g, '/');

        if (stat.isDirectory()) {
            index = index.concat(buildSearchIndex(fullPath));
        } else if (file.toLowerCase().endsWith('.md')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            index.push({
                name: file,
                path: relPath,
                content: content
            });
        }
    }
    return index;
}

function run() {
    console.log('Building GitHub Pages static assets...');
    
    if (!fs.existsSync(docsDir)) {
        console.error('Error: docs directory not found at', docsDir);
        process.exit(1);
    }
    
    // 1. Build tree.json
    const tree = buildTree(docsDir);
    fs.writeFileSync(path.join(__dirname, 'tree.json'), JSON.stringify(tree, null, 2));
    console.log('Generated tree.json');

    // 2. Build search_index.json
    const searchIndex = buildSearchIndex(docsDir);
    fs.writeFileSync(path.join(__dirname, 'search_index.json'), JSON.stringify(searchIndex, null, 2));
    console.log('Generated search_index.json');
    
    console.log('Build complete.');
}

run();

