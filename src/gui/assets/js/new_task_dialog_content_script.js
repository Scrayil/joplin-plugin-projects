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
    const startDateInput = document.getElementById('taskStartDate');
    const btnAddNewProject = document.getElementById('btnAddNewProject');

    // -- Fullscreen Subtasks --
    const subtaskContainer = document.querySelector('.form-group:has(#subTaskList)');
    const btnExpand = document.createElement('button');
    btnExpand.type = 'button';
    btnExpand.title = 'Expand Subtasks';
    btnExpand.innerHTML = '⤢';
    btnExpand.className = 'subtasks-expand-btn';
    btnExpand.style.cssText = 'background: var(--joplin-background-color-hover3); border: 1px solid var(--joplin-divider-color); color: var(--joplin-color); border-radius: 4px; cursor: pointer; font-size: 1rem; opacity: 0.8; padding: 2px 6px; line-height: 1; margin-left: auto;';
    
    const headerWrapper = document.createElement('div');
    headerWrapper.style.display = 'flex';
    headerWrapper.style.justifyContent = 'space-between';
    headerWrapper.style.alignItems = 'center';
    headerWrapper.style.marginBottom = '5px';
    
    // Find the label for Sub-tasks
    const label = subtaskContainer.querySelector('label');
    subtaskContainer.insertBefore(headerWrapper, label);
    headerWrapper.appendChild(label);
    headerWrapper.appendChild(btnExpand);

    const backdrop = document.createElement('div');
    backdrop.className = 'subtasks-expanded-backdrop';
    backdrop.style.display = 'none';
    const dialogRoot = document.querySelector('.dialog-root');
    if (dialogRoot) {
        dialogRoot.appendChild(backdrop);
    } else {
        document.body.appendChild(backdrop);
    }

    const expandedHeader = document.createElement('div');
    expandedHeader.className = 'subtasks-expanded-header';
    expandedHeader.style.display = 'none';
    expandedHeader.innerHTML = '<h3>Subtasks</h3><button type="button" class="subtasks-close-btn">&times;</button>';
    subtaskContainer.insertBefore(expandedHeader, subtaskContainer.firstChild);

    const closeBtn = expandedHeader.querySelector('.subtasks-close-btn');

    function toggleExpand() {
        const dialogRoot = document.querySelector('.dialog-root');
        const isExpanded = subtaskContainer.classList.contains('subtasks-expanded-overlay');
        if (isExpanded) {
            subtaskContainer.classList.remove('subtasks-expanded-overlay');
            backdrop.style.display = 'none';
            expandedHeader.style.display = 'none';
            headerWrapper.style.display = 'flex';
            list.classList.remove('expanded');
            list.style.maxHeight = '226px';
            list.style.flex = 'none';
            if (dialogRoot) dialogRoot.classList.remove('expanded-mode');
        } else {
            subtaskContainer.classList.add('subtasks-expanded-overlay');
            backdrop.style.display = 'block';
            expandedHeader.style.display = 'flex';
            headerWrapper.style.display = 'none';
            list.classList.add('expanded');
            list.style.maxHeight = 'none';
            list.style.flex = '1';
            if (dialogRoot) dialogRoot.classList.add('expanded-mode');
        }
        renderList();
    }

    btnExpand.addEventListener('click', toggleExpand);
    closeBtn.addEventListener('click', toggleExpand);
    backdrop.addEventListener('click', toggleExpand);


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
        dateInput.addEventListener('change', () => {
            if (startDateInput && startDateInput.value && dateInput.value) {
                if (new Date(startDateInput.value) > new Date(dateInput.value)) {
                    startDateInput.value = dateInput.value;
                }
            }
        });
    }

    if (startDateInput) {
        startDateInput.addEventListener('click', () => {
            if (typeof startDateInput.showPicker === 'function') startDateInput.showPicker();
        });
        startDateInput.addEventListener('change', () => {
            if (dateInput && dateInput.value && startDateInput.value) {
                if (new Date(startDateInput.value) > new Date(dateInput.value)) {
                    dateInput.value = startDateInput.value;
                }
            }
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

        // Clear all hints first to prevent ghosts
        document.querySelectorAll('.subtask-item').forEach(el => {
            el.classList.remove('drop-above', 'drop-below', 'drop-nest');
        });

        const target = e.currentTarget;
        const targetIndex = parseInt(target.dataset.index);

        if (draggedIndex === null || draggedIndex === targetIndex) return;

        // Visual calculation
        const rect = target.getBoundingClientRect();
        const relY = e.clientY - rect.top;
        const height = rect.height;

        // Zones: Top 25% (Above), Bottom 25% (Below), Middle 50% (Nest)
        
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
     * Builds a hierarchical tree using <details> and <summary> for expandable cards.
     */
    function renderList() {
        // Ensure hierarchy is valid before rendering
        normalizeLevels();

        list.innerHTML = '';
        
        // Build Tree from flat array
        const tree = [];
        const stack = [];

        subTasks.forEach((t, i) => {
            const node = { ...t, index: i, children: [] };
            while (stack.length > 0 && stack[stack.length - 1].level >= t.level) {
                stack.pop();
            }
            if (stack.length > 0) {
                stack[stack.length - 1].node.children.push(node);
            } else {
                tree.push(node);
            }
            stack.push({ node, level: t.level });
        });

        function createNodeElements(node) {
            const hasChildren = node.children.length > 0;
            
            const container = document.createElement('li');
            container.className = 'subtask-node-container';
            container.style.listStyle = 'none';
            
            // The droppable/draggable target
            const dropTarget = document.createElement('div');
            dropTarget.className = 'subtask-item';
            dropTarget.dataset.index = node.index;
            dropTarget.draggable = true;

            // Drag Handle
            const dragHandle = document.createElement('span');
            dragHandle.className = 'drag-handle';
            dragHandle.textContent = '⋮⋮';
            dropTarget.appendChild(dragHandle);

            // Title
            const span = document.createElement('span');
            span.textContent = node.title;
            span.title = node.title;
            span.style.flex = '1';
            dropTarget.appendChild(span);

            // Remove Button
            const btnRemove = document.createElement('button');
            btnRemove.type = 'button';
            btnRemove.className = 'btn-remove';
            btnRemove.textContent = '×';
            btnRemove.dataset.index = node.index;
            dropTarget.appendChild(btnRemove);

            // Events on dropTarget
            dropTarget.addEventListener('dragstart', handleDragStart);
            dropTarget.addEventListener('dragover', handleDragOver);
            dropTarget.addEventListener('dragend', handleDragEnd);
            dropTarget.addEventListener('drop', handleDrop);

            if (hasChildren) {
                const details = document.createElement('details');
                details.open = true;
                details.className = 'subtask-details-card';
                
                const summary = document.createElement('summary');
                summary.className = 'subtask-details-summary';
                
                // Add chevron
                const chevron = document.createElement('span');
                chevron.textContent = '▼';
                chevron.className = 'subtask-details-chevron';
                chevron.style.fontSize = '0.7rem';
                chevron.style.marginRight = '6px';
                chevron.style.opacity = '0.6';
                chevron.style.display = 'flex';
                chevron.style.alignItems = 'center';
                chevron.style.justifyContent = 'center';
                chevron.style.width = '12px';
                summary.appendChild(chevron);

                summary.appendChild(dropTarget);
                details.appendChild(summary);

                const childrenWrapper = document.createElement('div');
                childrenWrapper.className = 'subtask-details-body';
                node.children.forEach(childNode => {
                    childrenWrapper.appendChild(createNodeElements(childNode));
                });
                details.appendChild(childrenWrapper);
                
                container.appendChild(details);
            } else {
                dropTarget.classList.add('leaf-node');
                container.appendChild(dropTarget);
            }

            return container;
        }

        tree.forEach(node => {
            list.appendChild(createNodeElements(node));
        });
        
        // Add remaining empty rows to maintain a consistent visual height.
        // Normal view fits exactly 5 rows. Expanded view fits exactly 12 rows.
        const isExpanded = list.classList.contains('expanded');
        const targetRows = isExpanded ? 12 : 5;
        
        // Count total visible nodes to know how many slots are occupied
        let visibleCount = 0;
        function countNodes(nodes) {
            let count = 0;
            nodes.forEach(n => {
                count++;
                count += countNodes(n.children);
            });
            return count;
        }
        visibleCount = countNodes(tree);

        const remainingRows = Math.max(0, targetRows - visibleCount);
        
        for (let i = 0; i < remainingRows; i++) {
            const emptyLi = document.createElement('li');
            emptyLi.className = 'subtask-node-container';
            emptyLi.style.listStyle = 'none';
            emptyLi.style.display = 'flex';
            // emptyLi.style.flex = '1'; // Removed flex: 1 to prevent stretching
            
            const emptyItem = document.createElement('div');
            emptyItem.className = 'subtask-item empty';
            emptyItem.style.height = '38px'; // Fixed height
            emptyItem.style.minHeight = '38px';
            // emptyItem.style.flex = '1'; // Removed flex: 1 to prevent stretching
            
            // Add a very subtle horizontal separator line centered in the 4px flex gap.
            // Using box-shadow with a 2px vertical offset pushes the 1px line exactly in the middle of the 4px gap!
            if (i < remainingRows - 1 || visibleCount + i < targetRows - 1) {
                emptyItem.style.boxShadow = '0 2px 0 0 rgba(127, 127, 127, 0.3)';
            }
            
            emptyLi.appendChild(emptyItem);
            list.appendChild(emptyLi);
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
            e.preventDefault();
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