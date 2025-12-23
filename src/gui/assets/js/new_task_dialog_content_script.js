(function() {
    // 1. Theme Detection for Natvie Controls (Datetime picker)
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

    function updateList() {
        list.innerHTML = '';
        if (subTasks.length > 0) {
            list.classList.add('has-items');
        } else {
            list.classList.remove('has-items');
        }

        subTasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = 'subtask-item';
            li.innerHTML = `
                <span>${task}</span>
                <button type="button" class="btn-remove" data-index="${index}">×</button>
            `;
            list.appendChild(li);
        });
        // Store as newline-separated for backend compatibility
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
        if (e.target.classList.contains('btn-remove')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            subTasks.splice(index, 1);
            updateList();
        }
    });
})();