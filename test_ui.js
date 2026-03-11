const fs = require('fs');

function checkFile(path, regexes) {
    const content = fs.readFileSync(path, 'utf8');
    regexes.forEach(r => {
        if (r.test(content)) console.log(`Found unapproved color in ${path}: ${r}`);
    });
}

const files = [
    'src/gui/react/components/KanbanBoard.tsx',
    'src/gui/assets/css/new_task_dialog_content_style.css',
    'src/gui/react/style.css'
];

const patterns = [
    /rgba\(127,\s*127,\s*127/g
];

files.forEach(f => {
    if(fs.existsSync(f)) checkFile(f, patterns);
});

