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

    // -- State --
    let subTasks = []; // Array of { id, title, level }
    let draggedIndex = null;

    const input = document.getElementById('subTaskInput');
    const btn = document.getElementById('btnAddSubTask');
    const list = document.getElementById('subTaskList');
    const hiddenInput = document.getElementById('taskSubTasks');
    const dateInput = document.getElementById('taskDueDate');
    const btnAddNewProject = document.getElementById('btnAddNewProject');

    // -- Helpers --
    
    /**
     * Generates a random UUID-like string for task identification.
     * @returns {string} A random string.
     */
    function uuid() {
        return Math.random().toString(36).substr(2, 9);
    }

    /**
     * Sets the minimum allowed date for the due date input.
     */
    function updateMinDate() {
        if (dateInput) {
            const now = new Date();
            const isoStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            dateInput.min = isoStr;
        }
    }
    updateMinDate();

    // -- Serialization / Deserialization --

    /**
     * Converts the internal task objects to an indented markdown list string.
     * Updates the hidden input value used for form submission.
     */
    function serialize() {
        // Convert objects to indented markdown lines
        // 2 spaces per level
        const lines = subTasks.map(t => {
            const indent = '  '.repeat(t.level || 0);
            return `${indent}- [ ] ${t.title}`;
        });
        hiddenInput.value = lines.join('\n');
    }

    if (hiddenInput && hiddenInput.value) {
        const lines = hiddenInput.value.split('\n');
        lines.forEach(line => {
            if (!line.trim()) return;
            // Parse indentation
            const match = line.match(/^(\s*)(?:-\s*\[[ xX]\]\s*)?(.*)$/);
            if (match) {
                const rawIndent = match[1];
                let level = 0;
                // Assuming 2 spaces or 1 tab = 1 level
                if (rawIndent.includes('\t')) level = rawIndent.length;
                else level = Math.floor(rawIndent.length / 2);

                let title = match[2].trim();
                // Legacy cleanup
                if (title.startsWith('- [')) title = title.replace(/^-\s*\[[ xX]\]\s*/, '');

                subTasks.push({ id: uuid(), title: title, level: level });
            }
        });
    }

    // -- Internal Button Hack (Existing logic) --
    
    /**
     * Finds the internal "Add Project" button in the dialog footer.
     * @returns {HTMLButtonElement|null} The found button element or null.
     */
    function getInternalAddProjectBtn() {
        const buttons = window.parent.document.querySelectorAll('button');
        for (const btn of buttons) {
            if (btn.textContent === 'AddProjectInternal') return btn;
        }
        return null;
    }
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
            if (typeof dateInput.showPicker === 'function') dateInput.showPicker();
        });
    }

    // -- Drag & Drop Logic --

    /**
     * Handles the start of a drag operation.
     * Sets the dragged item index and applies visual feedback.
     * @param {DragEvent} e 
     */
    function handleDragStart(e) {
        draggedIndex = parseInt(e.target.dataset.index);
        e.dataTransfer.effectAllowed = 'move';
        // Optional: Custom drag image if needed, but default is usually fine
        e.target.style.opacity = '0.5';
    }

    /**
     * Handles the end of a drag operation.
     * Resets visual styles and clears the dragged index state.
     * @param {DragEvent} e 
     */
    function handleDragEnd(e) {
        e.target.style.opacity = '1';
        draggedIndex = null;
        // Cleanup visuals
        document.querySelectorAll('.subtask-item').forEach(el => {
            el.classList.remove('drop-above', 'drop-below', 'drop-nest');
        });
    }

    /**
     * Handles the dragover event to calculate drop zones.
     * Determines if the drop should be above, below, or nested based on mouse position.
     * Updates visual classes on the target element.
     * @param {DragEvent} e 
     */
    function handleDragOver(e) {
        e.preventDefault();
        const target = e.currentTarget;
        const targetIndex = parseInt(target.dataset.index);

        if (draggedIndex === null || draggedIndex === targetIndex) return;

        // Visual calculation
        const rect = target.getBoundingClientRect();
        const relY = e.clientY - rect.top;
        const height = rect.height;

        // Zones: Top 25% (Above), Bottom 25% (Below), Middle 50% (Nest)
        target.classList.remove('drop-above', 'drop-below', 'drop-nest');

        const targetTask = subTasks[targetIndex];

        if (relY < height * 0.25) {
            target.classList.add('drop-above');
        } else if (relY > height * 0.75) {
            target.classList.add('drop-below');
        } else {
            // Nesting Logic
            // 1. Can only nest if target is NOT a descendant of dragged item (avoid loops) - handled by visual check usually
            // 2. MAX LEVEL CHECK: Cannot nest if target is already at level 6
            if (targetTask.level < 6) {
                target.classList.add('drop-nest');
            }
        }
    }

    /**
     * Calculates the size of a task block (the task plus all its descendants).
     * Used to move a parent and its children together.
     * @param {number} startIndex Index of the parent task.
     * @returns {number} The total count of items in the block.
     */
    function getBlockSize(startIndex) {
        let size = 1;
        const rootLevel = subTasks[startIndex].level;
        for (let i = startIndex + 1; i < subTasks.length; i++) {
            if (subTasks[i].level > rootLevel) size++;
            else break;
        }
        return size;
    }

    /**
     * Handles the drop event, executing the move logic.
     * Updates the data structure, handles nesting rules, and triggers a re-render.
     * @param {DragEvent} e 
     */
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        const target = e.currentTarget;
        const targetIndex = parseInt(target.dataset.index);

        if (draggedIndex === null || draggedIndex === targetIndex) return;

        // Determine Action
        let action = 'nest';
        if (target.classList.contains('drop-above')) action = 'above';
        else if (target.classList.contains('drop-below')) action = 'below';

        // 1. Identify the moving block
        const movingBlockSize = getBlockSize(draggedIndex);
        // Safety: ensure we don't drop inside our own block
        if (targetIndex > draggedIndex && targetIndex < draggedIndex + movingBlockSize) {
             return; // Cancel drop
        }

        // 2. Extract the moving block (Remove from array)
        const itemsToMove = subTasks.splice(draggedIndex, movingBlockSize);
        const rootItem = itemsToMove[0];

        // 3. Adjust Target Index
        // If we removed items *before* the target, the target's index has shifted down.
        let actualTargetIndex = targetIndex;
        if (draggedIndex < targetIndex) {
            actualTargetIndex -= movingBlockSize;
        }
        const targetItem = subTasks[actualTargetIndex];

        // 4. Calculate Target Block Size (Crucial for Nest/Below)
        // We calculate this *after* removal to get the current state of the target in the list
        const targetBlockSize = getBlockSize(actualTargetIndex);

        // 5. Determine Insertion Index & Level
        let insertIndex;
        let levelDiff;
        let resetToRoot = false;

        // Special Logic for Max Level (6) targets
        if (targetItem.level >= 6) {
            if (action === 'nest') {
                action = 'below'; // Fallback to sibling
            } else if (action === 'below') {
                resetToRoot = true; // Break out to root
            }
        }

        if (action === 'nest') {
            // NEST: Insert AFTER target's entire block (append as last child)
            insertIndex = actualTargetIndex + targetBlockSize;
            levelDiff = (targetItem.level + 1) - rootItem.level;

        } else if (action === 'below') {
            // BELOW: Insert AFTER target's entire block (append as next sibling)
            insertIndex = actualTargetIndex + targetBlockSize;
            if (resetToRoot) {
                levelDiff = 0 - rootItem.level;
            } else {
                levelDiff = targetItem.level - rootItem.level;
            }

        } else { // action === 'above'
            // ABOVE: Insert AT target index (before target)
            insertIndex = actualTargetIndex;
            levelDiff = targetItem.level - rootItem.level;
        }

        // 6. Apply Level Change
        itemsToMove.forEach(t => t.level += levelDiff);

        // 7. Insert
        subTasks.splice(insertIndex, 0, ...itemsToMove);

        renderList();
    }

    // -- Rendering --

    /**
     * Normalizes the hierarchy levels to ensure validity.
     * Prevents gaps in the tree (e.g., jumping from Level 0 to Level 2).
     */
    function normalizeLevels() {
        if (subTasks.length === 0) return;
        
        // Rule 1: First item is always Root (Level 0)
        subTasks[0].level = 0;

        // Rule 2: No gaps in hierarchy
        for (let i = 1; i < subTasks.length; i++) {
            const prevLevel = subTasks[i - 1].level;
            if (subTasks[i].level > prevLevel + 1) {
                subTasks[i].level = prevLevel + 1;
            }
        }
    }

    /**
     * Renders the subtask list DOM elements.
     * Applies indentation styles, drag handles, and event listeners.
     */
    function renderList() {
        // Ensure hierarchy is valid before rendering
        normalizeLevels();

        list.innerHTML = '';
        
        const minRows = 5;
        const totalRows = Math.max(subTasks.length, minRows);

        for (let i = 0; i < totalRows; i++) {
            const li = document.createElement('li');
            
            if (i < subTasks.length) {
                // -- Render Real Task --
                const task = subTasks[i];
                li.className = 'subtask-item';
                li.dataset.index = i;
                li.draggable = true;

                // CSS Variables for indent/lines
                li.style.setProperty('--level', task.level);
                if (task.level > 0) {
                    li.style.setProperty('--has-parent', 'block');
                }

                // Indentation Guide (Hyphens) - Placed FIRST (Leftmost)
                if (task.level > 0) {
                    const indent = document.createElement('span');
                    indent.className = 'indent-guide';
                    indent.textContent = '-'.repeat(task.level);
                    li.appendChild(indent);
                }

                // Text with Tooltip
                const span = document.createElement('span');
                span.textContent = task.title;
                span.title = task.title;
                span.style.flex = '1';
                li.appendChild(span);

                // Remove Button
                const btnRemove = document.createElement('button');
                btnRemove.type = 'button';
                btnRemove.className = 'btn-remove';
                btnRemove.textContent = '×';
                btnRemove.dataset.index = i;
                li.appendChild(btnRemove);

                // Events
                li.addEventListener('dragstart', handleDragStart);
                li.addEventListener('dragover', handleDragOver);
                li.addEventListener('dragend', handleDragEnd);
                li.addEventListener('drop', handleDrop);
            } else {
                // -- Render Empty Row (Placeholder) --
                li.className = 'subtask-item empty';
                // No content, just visual lines
            }

            list.appendChild(li);
        }

        serialize();
    }

    // -- Interactions --

    btn.addEventListener('click', () => {
        const val = input.value.trim();
        if (val) {
            subTasks.push({ id: uuid(), title: val, level: 0 });
            input.value = '';
            renderList();
            list.scrollTop = list.scrollHeight;
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
            const index = parseInt(e.target.dataset.index);
            // Remove block (item + children)
            const blockSize = getBlockSize(index);
            subTasks.splice(index, blockSize);
            renderList();
        }
    });

    // Initial render
    renderList();

})();