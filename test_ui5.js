const fs = require('fs');
const path = 'src/gui/react/components/KanbanBoard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Use transparent instead of full joplin-background-color-hover3 for less aggressive solid rendering, and rely on borders for definition
content = content.replace(
    /background: 'var\(--joplin-background-color-hover3\)',/g,
    "background: 'transparent',"
);
fs.writeFileSync(path, content, 'utf8');
