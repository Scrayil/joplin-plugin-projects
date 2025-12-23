(function() {
    // 1. Theme Detection
    function updateTheme() {
        const textColor = getComputedStyle(document.body).getPropertyValue('--joplin-color').trim();
        let isDark = false;
        if (textColor.startsWith('#')) {
            const hex = textColor.substring(1);
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            if (brightness > 128) isDark = true;
        }
        document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    }
    updateTheme();

    const subTasks = [];
    const input = document.getElementById('subTaskInput');
    const btn = document.getElementById('btnAddSubTask');
    const list = document.getElementById('subTaskList');
    const hiddenInput = document.getElementById('taskSubTasks');
    const dateInput = document.getElementById('taskDueDate');

    // Open picker on any click on the date input
    if (dateInput) {
        dateInput.addEventListener('click', () => {
            if (typeof dateInput.showPicker === 'function') {
                dateInput.showPicker();
            }
        });
    }

    function updateList() {
        list.innerHTML = '';
        
        // Render at least 5 rows
        const rowsToRender = Math.max(5, subTasks.length);
        
        for (let i = 0; i < rowsToRender; i++) {
            const task = subTasks[i];
            const isEmpty = i >= subTasks.length;
            
            const li = document.createElement('li');
            li.className = 'subtask-item' + (isEmpty ? ' empty' : '');
            li.innerHTML = `
                <span>${isEmpty ? '-' : task}</span>
                <button type="button" class="btn-remove" data-index="${i}">×</button>
            `;
            list.appendChild(li);
        }
        
        // Store only real tasks
        hiddenInput.value = subTasks.join('\n');
    }

    btn.addEventListener('click', () => {
        const val = input.value.trim();
        if (val) {
            subTasks.push(val);
            input.value = '';
            updateList();
        }
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            btn.click();
        }
    });

    list.addEventListener('click', (e) => {
        const target = e.target.closest('.btn-remove');
        if (target) {
            const index = parseInt(target.getAttribute('data-index'));
            if (index < subTasks.length) {
                subTasks.splice(index, 1);
                updateList();
            }
        }
    });

    // Initial render
    updateList();
})();
