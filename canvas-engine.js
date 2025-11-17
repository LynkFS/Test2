/**
 * Canvas Rendering Engine
 * Handles viewport transformation, zoom, pan, and rendering
 */

class CanvasEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Viewport properties
        this.viewport = {
            x: 0,
            y: 0,
            zoom: 1,
            minZoom: 0.1,
            maxZoom: 3
        };

        // Interaction state
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.lastMousePos = { x: 0, y: 0 };

        // Animation
        this.animationFrame = null;

        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.setupEventListeners();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        // Center viewport if first time
        if (this.viewport.x === 0 && this.viewport.y === 0) {
            this.viewport.x = this.canvas.width / 2;
            this.viewport.y = this.canvas.height / 2;
        }
    }

    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));

        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Check if clicking on a node (delegated to app)
        const worldPos = this.screenToWorld(mouseX, mouseY);

        if (window.app && window.app.handleCanvasClick) {
            const handled = window.app.handleCanvasClick(worldPos.x, worldPos.y, e);
            if (handled) return;
        }

        // Start panning
        this.isDragging = true;
        this.dragStart = { x: mouseX, y: mouseY };
        this.lastMousePos = { x: mouseX, y: mouseY };
        this.canvas.classList.add('grabbing');
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (this.isDragging) {
            const dx = mouseX - this.lastMousePos.x;
            const dy = mouseY - this.lastMousePos.y;

            this.viewport.x += dx;
            this.viewport.y += dy;

            this.lastMousePos = { x: mouseX, y: mouseY };

            if (window.app) {
                window.app.render();
            }
        } else {
            // Hover detection (delegated to app)
            const worldPos = this.screenToWorld(mouseX, mouseY);
            if (window.app && window.app.handleCanvasHover) {
                window.app.handleCanvasHover(worldPos.x, worldPos.y);
            }
        }
    }

    onMouseUp(e) {
        this.isDragging = false;
        this.canvas.classList.remove('grabbing');
    }

    onWheel(e) {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Get world position before zoom
        const worldBefore = this.screenToWorld(mouseX, mouseY);

        // Update zoom
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = this.viewport.zoom * zoomDelta;

        if (newZoom >= this.viewport.minZoom && newZoom <= this.viewport.maxZoom) {
            this.viewport.zoom = newZoom;

            // Get world position after zoom
            const worldAfter = this.screenToWorld(mouseX, mouseY);

            // Adjust viewport to keep mouse position stable
            this.viewport.x += (worldAfter.x - worldBefore.x) * this.viewport.zoom;
            this.viewport.y += (worldAfter.y - worldBefore.y) * this.viewport.zoom;

            if (window.app) {
                window.app.render();
                window.app.updateZoomDisplay();
            }
        }
    }

    // Transform screen coordinates to world coordinates
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.viewport.x) / this.viewport.zoom,
            y: (screenY - this.viewport.y) / this.viewport.zoom
        };
    }

    // Transform world coordinates to screen coordinates
    worldToScreen(worldX, worldY) {
        return {
            x: worldX * this.viewport.zoom + this.viewport.x,
            y: worldY * this.viewport.zoom + this.viewport.y
        };
    }

    // Reset viewport to default
    resetView() {
        this.viewport.x = this.canvas.width / 2;
        this.viewport.y = this.canvas.height / 2;
        this.viewport.zoom = 1;

        if (window.app) {
            window.app.render();
            window.app.updateZoomDisplay();
        }
    }

    // Clear canvas
    clear() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }

    // Apply viewport transformation
    applyTransform() {
        this.ctx.setTransform(
            this.viewport.zoom, 0,
            0, this.viewport.zoom,
            this.viewport.x, this.viewport.y
        );
    }

    // Draw methods with viewport transformation
    drawCircle(x, y, radius, fillColor, strokeColor = null, strokeWidth = 1) {
        this.ctx.save();
        this.applyTransform();

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);

        if (fillColor) {
            this.ctx.fillStyle = fillColor;
            this.ctx.fill();
        }

        if (strokeColor) {
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = strokeWidth / this.viewport.zoom;
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawText(text, x, y, fontSize, color, align = 'center', baseline = 'middle') {
        this.ctx.save();
        this.applyTransform();

        this.ctx.font = `${fontSize}px Arial`;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        this.ctx.fillText(text, x, y);

        this.ctx.restore();
    }

    drawLine(x1, y1, x2, y2, color, width = 1) {
        this.ctx.save();
        this.applyTransform();

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width / this.viewport.zoom;
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawArrow(x1, y1, x2, y2, color, width = 1) {
        this.drawLine(x1, y1, x2, y2, color, width);

        // Draw arrowhead
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const arrowLength = 10;

        this.ctx.save();
        this.applyTransform();

        this.ctx.beginPath();
        this.ctx.moveTo(x2, y2);
        this.ctx.lineTo(
            x2 - arrowLength * Math.cos(angle - Math.PI / 6),
            y2 - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.moveTo(x2, y2);
        this.ctx.lineTo(
            x2 - arrowLength * Math.cos(angle + Math.PI / 6),
            y2 - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width / this.viewport.zoom;
        this.ctx.stroke();

        this.ctx.restore();
    }

    // Measure text width
    measureText(text, fontSize) {
        this.ctx.save();
        this.ctx.font = `${fontSize}px Arial`;
        const width = this.ctx.measureText(text).width;
        this.ctx.restore();
        return width;
    }
}
