/**
 * Main Application
 * Orchestrates all systems and handles user interaction
 */

class HierarchicalAppGenerator {
    constructor() {
        // Initialize systems
        this.canvasEngine = new CanvasEngine('main-canvas');
        this.nodeSystem = new NodeSystem();
        this.connectionSystem = new ConnectionSystem();
        this.claudeIntegration = new ClaudeIntegration();
        this.codeEditor = new CodeEditor();
        this.storage = new StorageSystem();

        // UI state
        this.isConnectMode = false;
        this.sidePanel = document.getElementById('side-panel');
        this.panelContent = document.getElementById('panel-content');
        this.modal = document.getElementById('modal-overlay');

        // Make accessible globally
        window.app = this;
        window.nodeSystem = this.nodeSystem;
        window.connectionSystem = this.connectionSystem;

        this.init();
    }

    init() {
        // Try to load saved data
        if (this.storage.hasSavedData()) {
            this.loadFromStorage();
        } else {
            // Initialize with default root node
            this.nodeSystem.initialize('Asset Management');
            this.addDefaultExampleNodes();
        }

        // Load Claude API key if exists
        this.claudeIntegration.loadApiKey();

        // Setup UI event listeners
        this.setupEventListeners();

        // Enable auto-save
        this.storage.enableAutoSave(this.nodeSystem, this.connectionSystem);

        // Initial render
        this.render();
        this.updateBreadcrumb();
        this.updateZoomDisplay();
    }

    setupEventListeners() {
        // Toolbar buttons
        document.getElementById('btn-back').onclick = () => this.navigateBack();
        document.getElementById('btn-add-node').onclick = () => this.showAddNodeModal();
        document.getElementById('btn-add-connection').onclick = () => this.toggleConnectMode();
        document.getElementById('btn-save').onclick = () => this.saveToStorage();
        document.getElementById('btn-load').onclick = () => this.loadFromStorage();
        document.getElementById('btn-export').onclick = () => this.exportData();
        document.getElementById('btn-reset-view').onclick = () => this.canvasEngine.resetView();

        // Panel close button
        document.getElementById('btn-close-panel').onclick = () => this.closePanel();

        // Modal controls
        document.getElementById('btn-modal-cancel').onclick = () => this.closeModal();
        document.getElementById('btn-modal-confirm').onclick = () => this.handleModalConfirm();

        // AI generate checkbox
        document.getElementById('ai-generate-checkbox').onchange = (e) => {
            document.getElementById('ai-context-input').disabled = !e.target.checked;
        };

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closePanel();
                this.closeModal();
                if (this.isConnectMode) {
                    this.toggleConnectMode();
                }
            }
            if (e.key === 'Backspace' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                this.navigateBack();
            }
        });
    }

    // Canvas interaction handlers
    handleCanvasClick(worldX, worldY, event) {
        const clickedNode = this.nodeSystem.hitTestNode(worldX, worldY);

        if (clickedNode) {
            if (this.isConnectMode) {
                // Connection mode
                if (!this.connectionSystem.isConnecting) {
                    this.connectionSystem.startConnection(clickedNode);
                    showNotification('Click another node to connect', 'info');
                } else {
                    const connection = this.connectionSystem.finishConnection(clickedNode);
                    if (connection) {
                        showNotification('Connection created', 'success');
                        this.render();
                    }
                }
                return true;
            } else {
                // Normal mode
                if (event.detail === 2) {
                    // Double click - navigate or open editor
                    if (clickedNode.hasChildren()) {
                        this.navigateToNode(clickedNode);
                    } else {
                        this.openNodeEditor(clickedNode);
                    }
                } else {
                    // Single click - select
                    this.selectNode(clickedNode);
                }
                return true;
            }
        } else {
            // Clicked empty space
            if (this.isConnectMode) {
                this.connectionSystem.cancelConnection();
            }
            this.nodeSystem.selectedNode = null;
            this.render();
        }

        return false;
    }

    handleCanvasHover(worldX, worldY) {
        const hoveredNode = this.nodeSystem.hitTestNode(worldX, worldY);

        if (hoveredNode !== this.nodeSystem.hoveredNode) {
            this.nodeSystem.hoveredNode = hoveredNode;
            this.render();
        }

        // Update temp connection endpoint if connecting
        if (this.connectionSystem.isConnecting) {
            this.connectionSystem.updateTempConnection(worldX, worldY);
            this.render();
        }
    }

    // Navigation
    navigateToNode(node) {
        if (this.nodeSystem.navigateToNode(node)) {
            this.updateBreadcrumb();
            this.closePanel();
            this.canvasEngine.resetView();
            this.render();
        }
    }

    navigateBack() {
        if (this.nodeSystem.navigateBack()) {
            this.updateBreadcrumb();
            this.closePanel();
            this.render();
        }
    }

    updateBreadcrumb() {
        const trail = document.getElementById('breadcrumb-trail');
        const stack = this.nodeSystem.navigationStack;

        trail.innerHTML = stack.map((node, index) => {
            const isLast = index === stack.length - 1;
            const separator = isLast ? '' : '<span class="breadcrumb-separator">/</span>';

            return `<span class="breadcrumb-item" data-index="${index}">${node.name}</span>${separator}`;
        }).join('');

        // Add click handlers
        trail.querySelectorAll('.breadcrumb-item').forEach(item => {
            item.onclick = () => {
                const index = parseInt(item.dataset.index);
                this.nodeSystem.navigateToStackIndex(index);
                this.updateBreadcrumb();
                this.closePanel();
                this.render();
            };
        });

        // Update back button state
        document.getElementById('btn-back').disabled = stack.length <= 1;
    }

    // Node operations
    selectNode(node) {
        this.nodeSystem.selectedNode = node;
        this.openNodePanel(node);
        this.render();
    }

    openNodePanel(node) {
        this.sidePanel.classList.remove('hidden');
        document.getElementById('panel-title').textContent = node.name;

        // Build panel content
        const html = `
            <div class="form-group">
                <label>Name:</label>
                <input type="text" id="edit-node-name" value="${node.name}">
            </div>

            <div class="form-group">
                <label>Type:</label>
                <select id="edit-node-type">
                    <option value="domain" ${node.type === 'domain' ? 'selected' : ''}>Domain</option>
                    <option value="process" ${node.type === 'process' ? 'selected' : ''}>Process</option>
                    <option value="logic" ${node.type === 'logic' ? 'selected' : ''}>Logic</option>
                    <option value="code" ${node.type === 'code' ? 'selected' : ''}>Code</option>
                </select>
            </div>

            <div class="form-group">
                <label>Description:</label>
                <textarea id="edit-node-desc" rows="4">${node.metadata.description || ''}</textarea>
            </div>

            <button class="btn-primary" id="btn-save-node">Save Changes</button>

            ${node.hasChildren() ? `
                <button class="btn-primary" id="btn-navigate-into">Navigate Into ↓</button>
            ` : `
                <button class="btn-primary" id="btn-open-code-editor">Open Code Editor</button>
            `}

            <button class="btn-primary" id="btn-generate-children">Generate Child Nodes (AI)</button>
            <button class="btn-danger" id="btn-delete-node">Delete Node</button>

            <hr style="border-color: #333; margin: 20px 0;">

            <p style="color: #666; font-size: 0.85em;">
                Created: ${formatDateTime(node.metadata.createdAt)}<br>
                Modified: ${formatDateTime(node.metadata.modifiedAt)}
            </p>
        `;

        this.panelContent.innerHTML = html;

        // Setup event listeners
        document.getElementById('btn-save-node').onclick = () => {
            node.name = document.getElementById('edit-node-name').value.trim() || node.name;
            node.type = document.getElementById('edit-node-type').value;
            node.metadata.description = document.getElementById('edit-node-desc').value.trim();
            node.metadata.modifiedAt = Date.now();

            showNotification('Node updated', 'success');
            this.updateBreadcrumb();
            this.render();
        };

        if (node.hasChildren()) {
            document.getElementById('btn-navigate-into').onclick = () => {
                this.navigateToNode(node);
            };
        } else {
            document.getElementById('btn-open-code-editor').onclick = () => {
                this.openNodeEditor(node);
            };
        }

        document.getElementById('btn-generate-children').onclick = () => {
            this.generateChildNodes(node);
        };

        document.getElementById('btn-delete-node').onclick = () => {
            if (confirm(`Delete node "${node.name}"?`)) {
                this.deleteCurrentNode();
            }
        };
    }

    openNodeEditor(node) {
        this.sidePanel.classList.remove('hidden');
        document.getElementById('panel-title').textContent = `Code: ${node.name}`;
        this.codeEditor.open(node, this.panelContent);
    }

    closePanel() {
        this.sidePanel.classList.add('hidden');
        this.codeEditor.close();
    }

    deleteCurrentNode() {
        const node = this.nodeSystem.selectedNode;
        if (node && this.nodeSystem.deleteNode(node.id)) {
            this.closePanel();
            this.nodeSystem.selectedNode = null;
            showNotification('Node deleted', 'success');
            this.render();
        }
    }

    // Add node modal
    showAddNodeModal() {
        this.modal.classList.remove('hidden');
        document.getElementById('modal-title').textContent = 'Create New Node';
        document.getElementById('node-name-input').value = '';
        document.getElementById('node-type-select').value = 'process';
        document.getElementById('ai-generate-checkbox').checked = false;
        document.getElementById('ai-context-input').value = '';
        document.getElementById('ai-context-input').disabled = true;
        document.getElementById('node-name-input').focus();
    }

    closeModal() {
        this.modal.classList.add('hidden');
    }

    async handleModalConfirm() {
        const name = document.getElementById('node-name-input').value.trim();
        const type = document.getElementById('node-type-select').value;
        const aiGenerate = document.getElementById('ai-generate-checkbox').checked;
        const aiContext = document.getElementById('ai-context-input').value.trim();

        if (!name) {
            showNotification('Please enter a node name', 'error');
            return;
        }

        this.closeModal();

        // Calculate position for new node
        const children = this.nodeSystem.currentNode.children;
        const angle = (children.length * Math.PI * 2 / 8);
        const radius = 200;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        // Create node
        const node = this.nodeSystem.addNode(name, type, x, y);

        // Generate children if requested
        if (aiGenerate) {
            await this.generateChildNodes(node, aiContext);
        }

        this.render();
        showNotification('Node created', 'success');
    }

    // AI generation
    async generateChildNodes(parentNode, context = '') {
        if (!this.claudeIntegration.isConfigured()) {
            const key = await this.claudeIntegration.promptForApiKey();
            if (!key) {
                showNotification('API key required for AI generation', 'error');
                return;
            }
        }

        showNotification('Generating child nodes...', 'info');

        try {
            const suggestions = await this.claudeIntegration.generateChildNodes(parentNode, context);

            if (suggestions.length === 0) {
                showNotification('No suggestions generated', 'error');
                return;
            }

            // Add suggested nodes
            suggestions.forEach((suggestion, index) => {
                const angle = (index * Math.PI * 2 / suggestions.length) - Math.PI / 2;
                const radius = 200;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                const childNode = new Node(suggestion.name, suggestion.type, x, y);
                childNode.metadata.description = suggestion.description;
                parentNode.addChild(childNode);
            });

            // If we're looking at this node's children, refresh view
            if (this.nodeSystem.currentNode === parentNode) {
                this.render();
            }

            showNotification(`${suggestions.length} child nodes generated`, 'success');

        } catch (error) {
            showNotification(`AI generation failed: ${error.message}`, 'error');
        }
    }

    // Connection mode
    toggleConnectMode() {
        this.isConnectMode = !this.isConnectMode;

        const btn = document.getElementById('btn-add-connection');
        if (this.isConnectMode) {
            btn.style.background = '#4aff9a';
            btn.style.borderColor = '#4aff9a';
            btn.style.color = '#1a1a1a';
            showNotification('Connection mode: Click two nodes to connect', 'info');
        } else {
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
            this.connectionSystem.cancelConnection();
        }

        this.render();
    }

    // Rendering
    render() {
        this.canvasEngine.clear();
        this.nodeSystem.render(this.canvasEngine);
    }

    updateZoomDisplay() {
        const zoomPercent = Math.round(this.canvasEngine.viewport.zoom * 100);
        document.getElementById('zoom-level').textContent = `${zoomPercent}%`;
    }

    // Storage operations
    saveToStorage() {
        if (this.storage.save(this.nodeSystem, this.connectionSystem)) {
            showNotification('Saved successfully', 'success');
        } else {
            showNotification('Save failed', 'error');
        }
    }

    loadFromStorage() {
        const data = this.storage.load();
        if (data) {
            this.nodeSystem.importFromJSON(data.rootNode);
            this.connectionSystem.importFromJSON(data.connections);
            this.updateBreadcrumb();
            this.canvasEngine.resetView();
            this.render();
            showNotification('Loaded successfully', 'success');
        } else {
            showNotification('No saved data found', 'error');
        }
    }

    exportData() {
        // Show export options
        const options = [
            'Export as JSON (data)',
            'Export as JavaScript (executable code)',
            'Cancel'
        ];

        const choice = prompt(`Choose export format:\n1. ${options[0]}\n2. ${options[1]}\n\nEnter 1 or 2:`);

        if (choice === '1') {
            this.storage.exportToFile(this.nodeSystem, this.connectionSystem);
        } else if (choice === '2') {
            this.storage.exportExecutableCode(this.nodeSystem, this.connectionSystem);
        }
    }

    // Add some default example nodes for first-time users
    addDefaultExampleNodes() {
        const root = this.nodeSystem.rootNode;

        // Add a few example child nodes
        const examples = [
            { name: 'Preventative Maintenance', type: 'process', x: -200, y: -100 },
            { name: 'Service Calls', type: 'process', x: 200, y: -100 },
            { name: 'Asset Inventory', type: 'process', x: 0, y: 150 }
        ];

        examples.forEach(ex => {
            const node = new Node(ex.name, ex.type, ex.x, ex.y);
            node.metadata.description = 'Example node - click to edit or delete';
            root.addChild(node);
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new HierarchicalAppGenerator();
});
