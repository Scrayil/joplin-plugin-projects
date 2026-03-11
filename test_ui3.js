const fs = require('fs');

const path = 'src/gui/assets/css/new_task_dialog_content_style.css';
let content = fs.readFileSync(path, 'utf8');

// Replace standard variables with ones using transparent alpha composition
content = content.replace(
    /background: var\(--joplin-background-color\);\n    border: 1px solid var\(--joplin-divider-color\);\n    border-radius: 6px;\n    overflow: hidden;\n    margin-top: 2px;/g,
    "background: transparent;\n    border: 1px solid var(--joplin-divider-color);\n    border-radius: 6px;\n    overflow: hidden;\n    margin-top: 2px;"
);
content = content.replace(
    /background: var\(--joplin-background-color-hover3\);\n    border-bottom: 1px solid var\(--joplin-divider-color\);/g,
    "background: transparent;\n    border-bottom: 1px solid var(--joplin-divider-color);"
);

fs.writeFileSync(path, content, 'utf8');
