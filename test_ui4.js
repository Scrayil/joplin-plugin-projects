const fs = require('fs');

const path = 'src/gui/react/components/KanbanBoard.tsx';
let content = fs.readFileSync(path, 'utf8');

// The best way to make the card background nice without being too strong is using background: none or transparent 
// combined with borders, as the user mentioned the solid colors were "troppo forti" (too strong).
content = content.replace(
    /border: '1px solid var\(--joplin-divider-color\)',/g,
    "border: '1px solid var(--border-color)',"
);

fs.writeFileSync(path, content, 'utf8');
