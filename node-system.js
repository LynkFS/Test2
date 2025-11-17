/**
 * Node System
 * Manages hierarchical node structure and rendering
 */

class Node {
    constructor(name, type = 'domain', x = 0, y = 0) {
        this.id = generateId();
        this.name = name;
        this.type = type; // domain, process, logic, code
        this.x = x;
        this.y = y;
        this.children = [];
        this.connections = []; // Array of connection IDs
        this.metadata = {
            description: '',
            code: '',
            createdAt: Date.now(),
            modifiedAt: Date.now()
        };
    }

    addChild(node) {
        this.children.push(node);
        this.metadata.modifiedAt = Date.now();
    }

    removeChild(nodeId) {
        const index = this.children.findIndex(n => n.id === nodeId);
        if (index !== -1) {
            this.children.splice(index, 1);
            this.metadata.modifiedAt = Date.now();
            return true;
        }
        return false;
    }

    findChildById(nodeId) {
        return this.children.find(n => n.id === nodeId);
    }

    hasChildren() {
        return this.children.length > 0;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            x: this.x,
            y: this.y,
            children: this.children.map(c => c.toJSON()),
            connections: this.connections,
            metadata: this.metadata
        };
    }

    static fromJSON(data) {
        const node = new Node(data.name, data.type, data.x, data.y);
        node.id = data.id;
        node.connections = data.connections || [];
        node.metadata = data.metadata || node.metadata;

        if (data.children) {
            node.children = data.children.map(c => Node.fromJSON(c));
        }

        return node;
    }
}

class NodeSystem {
    constructor() {
        this.rootNode = null;
        this.currentNode = null; // Current node being viewed
        this.navigationStack = []; // Stack for breadcrumb navigation
        this.selectedNode = null;
        this.hoveredNode = null;

        // Visual properties
        this.nodeRadius = 60;
        this.nodeColors = {
            domain: '#4a9eff',
            process: '#ff9a4a',
            logic: '#9a4aff',
            code: '#4aff9a'
        };
    }

    // Initialize with a root node
    initialize(domainName = 'My Application') {
        this.rootNode = new Node(domainName, 'domain', 0, 0);
        this.currentNode = this.rootNode;
        this.navigationStack = [this.rootNode];
    }

    // Get current node being viewed
    getCurrentNode() {
        return this.currentNode;
    }

    // Navigate to a child node
    navigateToNode(node) {
        if (node && node.hasChildren()) {
            this.currentNode = node;
            this.navigationStack.push(node);
            this.selectedNode = null;
            return true;
        }
        return false;
    }

    // Navigate back to parent
    navigateBack() {
        if (this.navigationStack.length > 1) {
            this.navigationStack.pop();
            this.currentNode = this.navigationStack[this.navigationStack.length - 1];
            this.selectedNode = null;
            return true;
        }
        return false;
    }

    // Navigate to specific node in stack
    navigateToStackIndex(index) {
        if (index >= 0 && index < this.navigationStack.length) {
            this.navigationStack = this.navigationStack.slice(0, index + 1);
            this.currentNode = this.navigationStack[this.navigationStack.length - 1];
            this.selectedNode = null;
            return true;
        }
        return false;
    }

    // Add node to current level
    addNode(name, type, x = 0, y = 0) {
        const node = new Node(name, type, x, y);
        this.currentNode.addChild(node);
        return node;
    }

    // Delete node
    deleteNode(nodeId) {
        if (this.currentNode) {
            return this.currentNode.removeChild(nodeId);
        }
        return false;
    }

    // Update node properties
    updateNode(nodeId, properties) {
        const node = this.currentNode.findChildById(nodeId);
        if (node) {
            Object.assign(node, properties);
            node.metadata.modifiedAt = Date.now();
            return true;
        }
        return false;
    }

    // Auto-layout nodes in a circle
    autoLayoutNodes() {
        const nodes = this.currentNode.children;
        if (nodes.length === 0) return;

        const radius = Math.max(200, nodes.length * 30);
        const angleStep = (Math.PI * 2) / nodes.length;

        nodes.forEach((node, index) => {
            const angle = angleStep * index - Math.PI / 2;
            node.x = Math.cos(angle) * radius;
            node.y = Math.sin(angle) * radius;
        });
    }

    // Check if a point hits a node
    hitTestNode(worldX, worldY) {
        const nodes = this.currentNode.children;

        for (let i = nodes.length - 1; i >= 0; i--) {
            const node = nodes[i];
            if (isPointInCircle(worldX, worldY, node.x, node.y, this.nodeRadius)) {
                return node;
            }
        }

        return null;
    }

    // Render current level
    render(canvasEngine) {
        const nodes = this.currentNode.children;

        // Draw connections first (under nodes)
        if (window.connectionSystem) {
            window.connectionSystem.render(canvasEngine, this.currentNode);
        }

        // Draw nodes
        nodes.forEach(node => {
            this.renderNode(canvasEngine, node);
        });
    }

    renderNode(canvasEngine, node) {
        const isSelected = this.selectedNode === node;
        const isHovered = this.hoveredNode === node;

        // Determine node appearance
        const baseColor = this.nodeColors[node.type] || '#4a9eff';
        let fillColor = baseColor;
        let strokeColor = null;
        let strokeWidth = 2;

        if (isSelected) {
            strokeColor = '#ffffff';
            strokeWidth = 4;
        } else if (isHovered) {
            strokeColor = '#ffffff';
            strokeWidth = 3;
        }

        // Draw node circle
        canvasEngine.drawCircle(
            node.x,
            node.y,
            this.nodeRadius,
            fillColor,
            strokeColor,
            strokeWidth
        );

        // Draw node name
        const fontSize = 14;
        const maxWidth = this.nodeRadius * 2 - 20;
        const textColor = '#ffffff';

        // Truncate text if too long
        let displayName = node.name;
        let textWidth = canvasEngine.measureText(displayName, fontSize);

        while (textWidth > maxWidth && displayName.length > 3) {
            displayName = displayName.slice(0, -4) + '...';
            textWidth = canvasEngine.measureText(displayName, fontSize);
        }

        canvasEngine.drawText(
            displayName,
            node.x,
            node.y,
            fontSize,
            textColor,
            'center',
            'middle'
        );

        // Draw icon indicator for children
        if (node.hasChildren()) {
            canvasEngine.drawCircle(
                node.x,
                node.y + this.nodeRadius - 15,
                8,
                '#ffffff',
                null
            );
            canvasEngine.drawText(
                '▼',
                node.x,
                node.y + this.nodeRadius - 15,
                10,
                baseColor,
                'center',
                'middle'
            );
        }

        // Draw code indicator
        if (node.type === 'code' || node.metadata.code) {
            canvasEngine.drawText(
                '</>',
                node.x,
                node.y - this.nodeRadius + 15,
                12,
                '#ffffff',
                'center',
                'middle'
            );
        }

        // Draw type badge
        const badgeY = node.y + this.nodeRadius + 20;
        const typeText = node.type.charAt(0).toUpperCase() + node.type.slice(1);
        canvasEngine.drawText(
            typeText,
            node.x,
            badgeY,
            11,
            '#999999',
            'center',
            'middle'
        );
    }

    // Export/Import
    exportToJSON() {
        return this.rootNode ? this.rootNode.toJSON() : null;
    }

    importFromJSON(data) {
        if (data) {
            this.rootNode = Node.fromJSON(data);
            this.currentNode = this.rootNode;
            this.navigationStack = [this.rootNode];
            this.selectedNode = null;
            return true;
        }
        return false;
    }
}
