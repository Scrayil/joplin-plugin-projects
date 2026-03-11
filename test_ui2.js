const fs = require('fs');

const path = 'src/gui/react/components/KanbanBoard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace standard variables with ones using transparent alpha composition
content = content.replace(
    /background: 'var\(--joplin-background-color\)',/g,
    "background: 'transparent',"
);
content = content.replace(
    /background: 'var\(--joplin-background-color-hover3\)',/g,
    "background: 'transparent',"
);

fs.writeFileSync(path, content, 'utf8');
