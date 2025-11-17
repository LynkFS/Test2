/**
 * Connection System
 * Manages connections/pathways between nodes
 */

class Connection {
    constructor(sourceId, targetId) {
        this.id = generateId();
        this.sourceId = sourceId;
        this.targetId = targetId;
        this.type = 'normal'; // normal, conditional, loop, llm
        this.label = '';
        this.condition = null; // For conditional connections
        this.metadata = {
            createdAt: Date.now()
        };
    }

    toJSON() {
        return {
            id: this.id,
            sourceId: this.sourceId,
            targetId: this.targetId,
            type: this.type,
            label: this.label,
            condition: this.condition,
            metadata: this.metadata
        };
    }

    static fromJSON(data) {
        const conn = new Connection(data.sourceId, data.targetId);
        conn.id = data.id;
        conn.type = data.type || 'normal';
        conn.label = data.label || '';
        conn.condition = data.condition || null;
        conn.metadata = data.metadata || conn.metadata;
        return conn;
    }
}

class ConnectionSystem {
    constructor() {
        this.connections = new Map(); // nodeId -> array of connections
        this.isConnecting = false;
        this.connectionStart = null;
        this.tempConnectionEnd = null;

        // Visual properties
        this.connectionColors = {
            normal: '#4a9eff',
            conditional: '#ff9a4a',
            loop: '#9a4aff',
            llm: '#4aff9a'
        };
    }

    // Start creating a connection
    startConnection(sourceNode) {
        this.isConnecting = true;
        this.connectionStart = sourceNode;
        this.tempConnectionEnd = null;
    }

    // Update temporary connection endpoint (for preview)
    updateTempConnection(worldX, worldY) {
        if (this.isConnecting) {
            this.tempConnectionEnd = { x: worldX, y: worldY };
        }
    }

    // Complete connection
    finishConnection(targetNode) {
        if (this.isConnecting && this.connectionStart && targetNode) {
            // Prevent self-connections
            if (this.connectionStart.id === targetNode.id) {
                this.cancelConnection();
                return null;
            }

            // Check if connection already exists
            if (this.connectionExists(this.connectionStart.id, targetNode.id)) {
                showNotification('Connection already exists', 'error');
                this.cancelConnection();
                return null;
            }

            // Create connection
            const connection = new Connection(
                this.connectionStart.id,
                targetNode.id
            );

            // Store connection
            if (!this.connections.has(this.connectionStart.id)) {
                this.connections.set(this.connectionStart.id, []);
            }
            this.connections.get(this.connectionStart.id).push(connection);

            // Update node references
            this.connectionStart.connections.push(connection.id);
            targetNode.connections.push(connection.id);

            this.cancelConnection();
            return connection;
        }

        this.cancelConnection();
        return null;
    }

    // Cancel connection creation
    cancelConnection() {
        this.isConnecting = false;
        this.connectionStart = null;
        this.tempConnectionEnd = null;
    }

    // Check if connection exists
    connectionExists(sourceId, targetId) {
        const sourceConnections = this.connections.get(sourceId);
        if (sourceConnections) {
            return sourceConnections.some(
                conn => conn.targetId === targetId
            );
        }
        return false;
    }

    // Get all connections for a node
    getNodeConnections(nodeId) {
        return this.connections.get(nodeId) || [];
    }

    // Get connection by ID
    findConnectionById(connectionId) {
        for (const [nodeId, conns] of this.connections) {
            const found = conns.find(c => c.id === connectionId);
            if (found) return found;
        }
        return null;
    }

    // Delete connection
    deleteConnection(connectionId) {
        for (const [nodeId, conns] of this.connections) {
            const index = conns.findIndex(c => c.id === connectionId);
            if (index !== -1) {
                conns.splice(index, 1);
                if (conns.length === 0) {
                    this.connections.delete(nodeId);
                }
                return true;
            }
        }
        return false;
    }

    // Update connection properties
    updateConnection(connectionId, properties) {
        const connection = this.findConnectionById(connectionId);
        if (connection) {
            Object.assign(connection, properties);
            return true;
        }
        return false;
    }

    // Render connections for current level
    render(canvasEngine, currentNode) {
        if (!currentNode) return;

        const children = currentNode.children;
        const nodeMap = new Map(children.map(n => [n.id, n]));

        // Draw all connections
        children.forEach(sourceNode => {
            const connections = this.getNodeConnections(sourceNode.id);

            connections.forEach(connection => {
                const targetNode = nodeMap.get(connection.targetId);
                if (targetNode) {
                    this.renderConnection(
                        canvasEngine,
                        sourceNode,
                        targetNode,
                        connection
                    );
                }
            });
        });

        // Draw temporary connection (while creating)
        if (this.isConnecting && this.connectionStart && this.tempConnectionEnd) {
            canvasEngine.drawArrow(
                this.connectionStart.x,
                this.connectionStart.y,
                this.tempConnectionEnd.x,
                this.tempConnectionEnd.y,
                '#ffffff88',
                2
            );
        }
    }

    renderConnection(canvasEngine, sourceNode, targetNode, connection) {
        const color = this.connectionColors[connection.type] || '#4a9eff';

        // Draw arrow from source to target
        canvasEngine.drawArrow(
            sourceNode.x,
            sourceNode.y,
            targetNode.x,
            targetNode.y,
            color,
            2
        );

        // Draw label if exists
        if (connection.label) {
            const midX = (sourceNode.x + targetNode.x) / 2;
            const midY = (sourceNode.y + targetNode.y) / 2;

            // Background for label
            canvasEngine.drawCircle(midX, midY, 20, '#2a2a2a', color, 1);
            canvasEngine.drawText(
                connection.label,
                midX,
                midY,
                10,
                '#ffffff',
                'center',
                'middle'
            );
        }
    }

    // Get connections for current level only
    getConnectionsForLevel(currentNode) {
        if (!currentNode) return [];

        const levelConnections = [];
        const childIds = new Set(currentNode.children.map(n => n.id));

        currentNode.children.forEach(node => {
            const connections = this.getNodeConnections(node.id);
            connections.forEach(conn => {
                // Only include connections where both nodes are in current level
                if (childIds.has(conn.targetId)) {
                    levelConnections.push(conn);
                }
            });
        });

        return levelConnections;
    }

    // Export/Import
    exportToJSON() {
        const allConnections = [];
        for (const [nodeId, conns] of this.connections) {
            allConnections.push(...conns.map(c => c.toJSON()));
        }
        return allConnections;
    }

    importFromJSON(data) {
        this.connections.clear();

        if (data && Array.isArray(data)) {
            data.forEach(connData => {
                const conn = Connection.fromJSON(connData);
                if (!this.connections.has(conn.sourceId)) {
                    this.connections.set(conn.sourceId, []);
                }
                this.connections.get(conn.sourceId).push(conn);
            });
        }
    }

    // Clear all connections for current level
    clearLevel(currentNode) {
        if (!currentNode) return;

        const childIds = new Set(currentNode.children.map(n => n.id));

        // Remove connections where source is in current level
        childIds.forEach(nodeId => {
            this.connections.delete(nodeId);
        });
    }
}
