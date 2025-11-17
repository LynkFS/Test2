# Hierarchical App Generator

A visual, hierarchical web application generator that allows you to design applications from high-level domain concepts down to executable code.

## Overview

This tool provides a unique approach to application design through progressive refinement:

- **Level 0**: Domain node (e.g., "Asset Management")
- **Level 1+**: Business processes, logic flows, and decision points
- **Leaf Nodes**: Executable JavaScript code

## Features

### Core Functionality

✅ **Visual Canvas**
- Interactive graph-style node visualization
- Zoom and pan controls
- Intuitive navigation between levels

✅ **Hierarchical Structure**
- Drill down from domain to implementation
- Breadcrumb navigation
- Flexible node types (Domain, Process, Logic, Code)

✅ **Node Connections**
- Draw pathways between nodes
- Visual data flow representation
- Support for complex workflows

✅ **AI-Powered Generation**
- Auto-generate child nodes using Claude API
- Context-aware suggestions
- Accelerate application design

✅ **Code Editor**
- Built-in JavaScript editor for leaf nodes
- Test execution environment
- Live output preview

✅ **Persistence**
- Auto-save to LocalStorage
- Export/import as JSON
- Export executable JavaScript code

## Getting Started

### 1. Open the Application

Simply open `index.html` in a modern web browser:

```bash
open index.html
# or
python -m http.server 8000  # then visit http://localhost:8000
```

### 2. Basic Usage

**Navigate the Canvas:**
- **Click + Drag**: Pan the viewport
- **Mouse Wheel**: Zoom in/out
- **Double-click node**: Navigate into node (if it has children) or open code editor
- **Single-click node**: Select and view details in side panel

**Create Nodes:**
1. Click "+ Add Node" button
2. Enter node name and select type
3. Optionally enable AI generation for child nodes
4. Click "Create"

**Connect Nodes:**
1. Click "🔗 Connect" button to enter connection mode
2. Click source node
3. Click target node
4. Connection is created

**Edit Nodes:**
- Single-click a node to open the side panel
- Modify name, type, description
- Generate child nodes with AI
- Delete node if needed

**Code Nodes:**
- Double-click a leaf node (or click "Open Code Editor")
- Write JavaScript code in the editor
- Click "Test Run" to execute code
- Click "Save Code" to persist changes

### 3. AI-Powered Node Generation

To use Claude API for automatic child node generation:

1. Click on a node to select it
2. Click "Generate Child Nodes (AI)" in the side panel
3. On first use, you'll be prompted for your Claude API key
   - Get your key from: https://console.anthropic.com/
4. The system will generate 3-7 relevant child nodes

You can also enable AI generation when creating a new node by checking the "Auto-generate child nodes using AI" checkbox.

### 4. Saving and Loading

**Auto-Save:**
- The application automatically saves to LocalStorage every 30 seconds
- Your work persists across browser sessions

**Manual Save:**
- Click "💾 Save" to save immediately

**Load:**
- Click "📂 Load" to reload from LocalStorage

**Export:**
- Click "📤 Export" to download your application
- Choose between:
  - JSON format (for backup/sharing)
  - JavaScript code (executable)

## Architecture

### File Structure

```
├── index.html              # Main HTML structure
├── style.css               # Application styling
├── utils.js                # Utility functions
├── canvas-engine.js        # Canvas rendering & viewport
├── node-system.js          # Node data model & management
├── connection-system.js    # Connection management
├── claude-integration.js   # Claude API integration
├── code-editor.js          # Code editing functionality
├── storage.js              # LocalStorage & export/import
└── app.js                  # Main application controller
```

### Node Types

- **Domain**: Top-level domain/application nodes
- **Process**: Business processes or major functional areas
- **Logic**: Workflow logic, decision points, conditions
- **Code**: Executable JavaScript code nodes

### Data Flow

1. User creates/edits nodes visually
2. Nodes are organized hierarchically
3. Connections represent data flow between nodes
4. Code nodes contain executable JavaScript
5. Export generates runnable code from the structure

## Usage Examples

### Example 1: Asset Management System

```
Asset Management (Domain)
├── Preventative Maintenance (Process)
│   ├── Schedule Maintenance (Logic)
│   ├── Track Work Orders (Logic)
│   └── Update Asset Status (Code)
├── Service Calls (Process)
│   ├── Create Service Request (Logic)
│   ├── Assign Technician (Logic)
│   └── Log Service History (Code)
└── Asset Inventory (Process)
    ├── Add New Asset (Logic)
    ├── Update Asset Info (Code)
    └── Generate Reports (Code)
```

### Example 2: E-Commerce Flow

```
E-Commerce Platform (Domain)
├── User Authentication (Process)
│   ├── Login Flow (Logic)
│   └── Validate Credentials (Code)
├── Product Catalog (Process)
│   ├── Browse Products (Logic)
│   ├── Search & Filter (Code)
│   └── Display Details (Code)
└── Shopping Cart (Process)
    ├── Add to Cart (Logic)
    ├── Calculate Total (Code)
    └── Checkout Process (Logic)
```

## Keyboard Shortcuts

- **Escape**: Close panel/modal, cancel connection mode
- **Backspace**: Navigate back to parent level

## Advanced Features

### Code Execution

Code nodes receive an `input` parameter (JavaScript object) from connected upstream nodes and can return output for downstream nodes.

Example code node:

```javascript
function process(input) {
  // Process incoming data
  const result = {
    processedAt: Date.now(),
    data: input
  };

  // Return output for downstream nodes
  return result;
}

return process(input);
```

### Connection Types

While the current version supports basic connections, the architecture is designed to support:
- **Normal**: Standard data flow
- **Conditional**: If-then-else branches
- **Loop**: Iterative processing
- **LLM**: Integration with language models

(These advanced connection types can be implemented in future versions)

## Technical Details

### Browser Requirements

- Modern browser with Canvas support
- JavaScript enabled
- LocalStorage enabled
- Recommended: Chrome, Firefox, Safari, Edge (latest versions)

### Performance

- Handles hundreds of nodes efficiently
- Canvas rendering optimized for smooth interaction
- Lazy loading of node levels
- Efficient viewport culling

### Security Notes

- Claude API key stored in LocalStorage (client-side only)
- Code execution sandboxed within browser context
- No server-side components required
- All data stays in your browser

## Troubleshooting

**Nodes not appearing:**
- Check browser console for errors
- Verify JavaScript is enabled
- Try resetting the view (🎯 Reset View button)

**AI generation not working:**
- Verify Claude API key is correct
- Check internet connection
- Ensure API key has proper permissions
- Check browser console for error details

**Performance issues:**
- Try reducing zoom level
- Close unused browser tabs
- Clear LocalStorage and restart

## Future Enhancements

Potential features for future versions:
- Advanced connection types (conditionals, loops)
- Collaborative editing (real-time multi-user)
- Monaco Editor integration (better code editing)
- Template library (pre-built node structures)
- Visual execution/debugging
- Export to other formats (React, Vue, etc.)
- Backend integration options
- Version control/history

## License

This project is open source and available for use and modification.

## Support

For issues, questions, or contributions, please refer to the project repository.

---

**Built with:** Vanilla JavaScript, HTML5 Canvas, Claude API

**Version:** 1.0.0
