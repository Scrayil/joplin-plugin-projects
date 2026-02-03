(function() {
    /**
     * Detects Joplin's theme (light/dark) and applies it to the dialog.
     */
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
    const btnAddNewProject = document.getElementById('btnAddNewProject');

    /**
     * Sets the minimum allowed date for the due date input to prevent past dates.
     */
    function updateMinDate() {
        if (dateInput) {
            const now = new Date();
            // Format to YYYY-MM-DDTHH:mm for datetime-local input type
            const isoStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            dateInput.min = isoStr;
        }
    }
    updateMinDate();

    /**
     * Initializes the subTasks array from the value of a hidden input,
     * which is crucial for populating subtasks when editing an existing task.
     */
    if (hiddenInput && hiddenInput.value) {
        const initialTasks = hiddenInput.value.split('\n');
        initialTasks.forEach(t => {
            if (t.trim()) subTasks.push(t.trim());
        });
    }

    /**
     * Finds the internal "Add Project" button in the dialog footer by its text content.
     * This button is used to trigger the new project dialog from within the new task dialog.
     * @returns {HTMLButtonElement|null} The found button element or null.
     */
    function getInternalAddProjectBtn() {
        const buttons = window.parent.document.querySelectorAll('button');
        for (const btn of buttons) {
            if (btn.textContent === 'AddProjectInternal') return btn;
        }
        return null;
    }

    // Hide the internal button as soon as it's found
    const hideInterval = setInterval(() => {
        const btn = getInternalAddProjectBtn();
        if (btn) {
            btn.style.display = 'none';
            clearInterval(hideInterval);
        }
    }, 50);
    setTimeout(() => clearInterval(hideInterval), 2000); 

    if (btnAddNewProject) {
        btnAddNewProject.addEventListener('click', () => {
            const btn = getInternalAddProjectBtn();
            if (btn) btn.click();
        });
    }

    if (dateInput) {
        dateInput.addEventListener('click', () => {
            if (typeof dateInput.showPicker === 'function') {
                dateInput.showPicker();
            }
        });
    }

    /**
     * Updates the displayed list of subtasks in the UI and synchronizes with the hidden input field.
     * Ensures a minimum number of list rows are rendered even if empty.
     */
    function updateList() {
        list.innerHTML = '';
        const rowsToRender = Math.max(5, subTasks.length); // Ensure at least 5 rows are always shown
        for (let i = 0; i < rowsToRender; i++) {
            const task = subTasks[i];
            const isEmpty = i >= subTasks.length;
            const li = document.createElement('li');
            li.className = 'subtask-item' + (isEmpty ? ' empty' : '');
            
            const span = document.createElement('span');
            span.textContent = isEmpty ? '-' : task;
            li.appendChild(span);

            const btnRemove = document.createElement('button');
            btnRemove.type = 'button';
            btnRemove.className = 'btn-remove';
            btnRemove.setAttribute('data-index', i);
            btnRemove.textContent = '×';
            li.appendChild(btnRemove);

            list.appendChild(li);
        }
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

    // Initial render of the subtask list when the dialog opens
    updateList();
})();