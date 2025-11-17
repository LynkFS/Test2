/**
 * Storage System
 * Handles LocalStorage persistence and export/import
 */

class StorageSystem {
    constructor() {
        this.storageKey = 'hierarchical_app_generator_data';
        this.autoSaveEnabled = true;
        this.autoSaveInterval = 30000; // 30 seconds
        this.autoSaveTimer = null;
    }

    // Save entire app state to LocalStorage
    save(nodeSystem, connectionSystem) {
        try {
            const data = {
                version: '1.0',
                savedAt: Date.now(),
                rootNode: nodeSystem.exportToJSON(),
                connections: connectionSystem.exportToJSON(),
                metadata: {
                    appName: nodeSystem.rootNode?.name || 'Untitled App'
                }
            };

            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;

        } catch (error) {
            console.error('Failed to save to LocalStorage:', error);
            return false;
        }
    }

    // Load app state from LocalStorage
    load() {
        try {
            const dataStr = localStorage.getItem(this.storageKey);
            if (!dataStr) {
                return null;
            }

            const data = JSON.parse(dataStr);
            return data;

        } catch (error) {
            console.error('Failed to load from LocalStorage:', error);
            return null;
        }
    }

    // Check if saved data exists
    hasSavedData() {
        return !!localStorage.getItem(this.storageKey);
    }

    // Clear saved data
    clear() {
        localStorage.removeItem(this.storageKey);
    }

    // Export to JSON file
    exportToFile(nodeSystem, connectionSystem, filename = null) {
        const data = {
            version: '1.0',
            exportedAt: Date.now(),
            rootNode: nodeSystem.exportToJSON(),
            connections: connectionSystem.exportToJSON(),
            metadata: {
                appName: nodeSystem.rootNode?.name || 'Untitled App'
            }
        };

        const defaultFilename = `${this.sanitizeFilename(data.metadata.appName)}_${Date.now()}.json`;
        downloadJSON(data, filename || defaultFilename);
    }

    // Import from JSON file
    importFromFile(callback) {
        importJSON((data) => {
            if (this.validateImportData(data)) {
                callback(data);
            } else {
                showNotification('Invalid file format', 'error');
            }
        });
    }

    // Validate import data structure
    validateImportData(data) {
        return data &&
            data.version &&
            data.rootNode &&
            data.rootNode.id &&
            data.rootNode.name;
    }

    // Sanitize filename
    sanitizeFilename(name) {
        return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }

    // Enable auto-save
    enableAutoSave(nodeSystem, connectionSystem) {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        this.autoSaveTimer = setInterval(() => {
            if (this.autoSaveEnabled) {
                this.save(nodeSystem, connectionSystem);
                console.log('Auto-saved at', new Date().toLocaleTimeString());
            }
        }, this.autoSaveInterval);
    }

    // Disable auto-save
    disableAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    // Export executable JavaScript code
    exportExecutableCode(nodeSystem, connectionSystem) {
        const generator = new CodeGenerator(nodeSystem, connectionSystem);
        const code = generator.generate();

        const filename = `${this.sanitizeFilename(nodeSystem.rootNode?.name || 'app')}_generated.js`;
        const blob = new Blob([code], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);

        showNotification('Code exported successfully', 'success');
    }
}

/**
 * Code Generator
 * Generates executable JavaScript from node structure
 */
class CodeGenerator {
    constructor(nodeSystem, connectionSystem) {
        this.nodeSystem = nodeSystem;
        this.connectionSystem = connectionSystem;
    }

    generate() {
        const rootNode = this.nodeSystem.rootNode;
        if (!rootNode) {
            return '// No application structure defined';
        }

        let code = `/**
 * Generated Application Code
 * Application: ${rootNode.name}
 * Generated: ${new Date().toISOString()}
 */

`;

        code += this.generateNodeCode(rootNode, 0);
        code += this.generateExecutionCode(rootNode);

        return code;
    }

    generateNodeCode(node, depth) {
        let code = '';
        const indent = '  '.repeat(depth);

        // Generate function for this node if it has code
        if (node.metadata.code) {
            code += `${indent}// ${node.name}\n`;
            code += `${indent}function ${this.getFunctionName(node)}(input) {\n`;
            code += this.indentCode(node.metadata.code, depth + 1);
            code += `${indent}}\n\n`;
        }

        // Recursively generate code for children
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                code += this.generateNodeCode(child, depth);
            });
        }

        return code;
    }

    generateExecutionCode(rootNode) {
        let code = `// Main execution\n`;
        code += `async function main() {\n`;
        code += `  const initialInput = {};\n`;
        code += `  \n`;
        code += `  // Execute node graph\n`;
        code += `  try {\n`;
        code += this.generateExecutionFlow(rootNode, 2);
        code += `  } catch (error) {\n`;
        code += `    console.error('Execution error:', error);\n`;
        code += `  }\n`;
        code += `}\n\n`;
        code += `// Run application\n`;
        code += `main();\n`;

        return code;
    }

    generateExecutionFlow(node, depth) {
        let code = '';
        const indent = '  '.repeat(depth);

        if (node.metadata.code) {
            const funcName = this.getFunctionName(node);
            code += `${indent}console.log('Executing: ${node.name}');\n`;
            code += `${indent}const ${funcName}_result = ${funcName}(initialInput);\n`;
        }

        // Process children
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                code += this.generateExecutionFlow(child, depth);
            });
        }

        return code;
    }

    getFunctionName(node) {
        return node.id.replace(/[^a-zA-Z0-9]/g, '_');
    }

    indentCode(code, depth) {
        const indent = '  '.repeat(depth);
        return code.split('\n').map(line => indent + line).join('\n') + '\n';
    }
}
