/**
 * Code Editor
 * Simple code editing functionality for leaf nodes
 * (Can be enhanced with Monaco or CodeMirror later)
 */

class CodeEditor {
    constructor() {
        this.currentNode = null;
        this.editorElement = null;
    }

    // Open code editor for a node
    open(node, panelContentElement) {
        this.currentNode = node;

        // Create editor UI
        const editorHTML = `
            <div class="form-group">
                <label>Node Name:</label>
                <input type="text" id="code-node-name" value="${node.name}">
            </div>

            <div class="form-group">
                <label>Description:</label>
                <textarea id="code-node-description" rows="3">${node.metadata.description || ''}</textarea>
            </div>

            <div class="form-group">
                <label>JavaScript Code:</label>
                <div id="code-editor-container">
                    <textarea id="code-editor" spellcheck="false">${node.metadata.code || this.getDefaultCode(node)}</textarea>
                </div>
            </div>

            <button class="btn-primary" id="btn-save-code">Save Code</button>
            <button class="btn-primary" id="btn-test-code">Test Run</button>
            <button class="btn-danger" id="btn-delete-node">Delete Node</button>

            <div id="code-output" style="margin-top: 20px; display: none;">
                <h4 style="color: #4a9eff; margin-bottom: 10px;">Output:</h4>
                <pre style="background: #1a1a1a; padding: 10px; border-radius: 4px; overflow-x: auto; color: #4aff9a;"></pre>
            </div>
        `;

        panelContentElement.innerHTML = editorHTML;

        this.editorElement = document.getElementById('code-editor');

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        const saveBtn = document.getElementById('btn-save-code');
        const testBtn = document.getElementById('btn-test-code');
        const deleteBtn = document.getElementById('btn-delete-node');
        const nameInput = document.getElementById('code-node-name');
        const descInput = document.getElementById('code-node-description');

        saveBtn.onclick = () => {
            this.saveCode();
        };

        testBtn.onclick = () => {
            this.testCode();
        };

        deleteBtn.onclick = () => {
            if (confirm(`Delete node "${this.currentNode.name}"?`)) {
                if (window.app) {
                    window.app.deleteCurrentNode();
                }
            }
        };

        // Auto-save on change (debounced)
        const autoSave = debounce(() => {
            this.saveCode(true);
        }, 1000);

        this.editorElement.addEventListener('input', autoSave);
        nameInput.addEventListener('input', autoSave);
        descInput.addEventListener('input', autoSave);

        // Add tab support in textarea
        this.editorElement.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = e.target.selectionStart;
                const end = e.target.selectionEnd;
                const value = e.target.value;

                e.target.value = value.substring(0, start) + '  ' + value.substring(end);
                e.target.selectionStart = e.target.selectionEnd = start + 2;
            }
        });
    }

    saveCode(silent = false) {
        if (!this.currentNode) return;

        const code = this.editorElement.value;
        const name = document.getElementById('code-node-name').value.trim();
        const description = document.getElementById('code-node-description').value.trim();

        this.currentNode.name = name || this.currentNode.name;
        this.currentNode.metadata.code = code;
        this.currentNode.metadata.description = description;
        this.currentNode.metadata.modifiedAt = Date.now();

        if (!silent) {
            showNotification('Code saved', 'success');
        }

        if (window.app) {
            window.app.render();
        }
    }

    testCode() {
        if (!this.currentNode) return;

        const code = this.editorElement.value;
        const outputDiv = document.getElementById('code-output');
        const outputPre = outputDiv.querySelector('pre');

        // Clear previous output
        outputPre.textContent = '';
        outputDiv.style.display = 'block';

        // Capture console output
        const logs = [];
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        console.log = (...args) => {
            logs.push(['LOG', ...args]);
            originalLog.apply(console, args);
        };
        console.error = (...args) => {
            logs.push(['ERROR', ...args]);
            originalError.apply(console, args);
        };
        console.warn = (...args) => {
            logs.push(['WARN', ...args]);
            originalWarn.apply(console, args);
        };

        try {
            // Execute code
            const func = new Function('input', code);
            const result = func({});

            if (result !== undefined) {
                logs.push(['RETURN', result]);
            }

            // Display output
            outputPre.textContent = logs.map(log => {
                const [type, ...args] = log;
                const message = args.map(arg => {
                    if (typeof arg === 'object') {
                        return JSON.stringify(arg, null, 2);
                    }
                    return String(arg);
                }).join(' ');

                return `[${type}] ${message}`;
            }).join('\n') || '(no output)';

            outputPre.style.color = '#4aff9a';

        } catch (error) {
            outputPre.textContent = `[ERROR] ${error.message}\n${error.stack}`;
            outputPre.style.color = '#ff4a4a';
        } finally {
            // Restore console
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;
        }
    }

    getDefaultCode(node) {
        return `// ${node.name}
// This function receives input from connected nodes
// and returns output to downstream nodes

function process(input) {
  // Your code here

  return {
    success: true,
    data: input
  };
}

// Execute
return process(input);`;
    }

    close() {
        this.currentNode = null;
        this.editorElement = null;
    }
}
