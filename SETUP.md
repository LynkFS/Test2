# Setup Instructions

## Quick Start

### Prerequisites

- Node.js installed (version 14 or higher)
- A Claude API key from https://console.anthropic.com/

### Installation

1. **Navigate to the project directory:**
   ```bash
   cd Test2
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open your browser:**
   - Visit: http://localhost:3000
   - The app will load automatically

5. **Configure Claude API:**
   - When you first try to generate child nodes, you'll be prompted for your API key
   - Enter your Claude API key from https://console.anthropic.com/
   - The key will be saved in your browser's LocalStorage

## Why You Need the Server

The application includes a Node.js server to solve a technical limitation:

**CORS (Cross-Origin Resource Sharing) Issue:**
- Browsers block direct API calls from web pages to external APIs for security
- The server acts as a "proxy" between your browser and Claude's API
- This allows the AI features to work properly

## Alternative: Run Without AI Features

If you don't want to run the server, you can still use the app without AI:

1. **Open directly in browser:**
   ```bash
   open index.html
   ```

2. **What works:**
   - ✅ Create nodes manually
   - ✅ Connect nodes
   - ✅ Edit node properties
   - ✅ Write code in code editor
   - ✅ Save/load/export
   - ✅ All visual features

3. **What won't work:**
   - ❌ Auto-generate child nodes (AI feature)

## Troubleshooting

### "Failed to fetch" Error

**Problem:** You see "Failed to fetch" when generating child nodes.

**Solution:**
1. Make sure the server is running (`npm start`)
2. Verify you're accessing via http://localhost:3000 (not file://)
3. Check the terminal for any error messages

### "Proxy server not running" Error

**Problem:** Error says proxy server is not running.

**Solution:**
```bash
# Stop any existing server (Ctrl+C)
# Reinstall dependencies
npm install

# Start server
npm start
```

### Port 3000 Already In Use

**Problem:** Port 3000 is already taken by another application.

**Solution:**
```bash
# Option 1: Use a different port
PORT=8080 npm start

# Option 2: Find and stop the process using port 3000
# On Mac/Linux:
lsof -ti:3000 | xargs kill

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Invalid API Key

**Problem:** Getting "Invalid API key" error.

**Solution:**
1. Verify your API key at https://console.anthropic.com/
2. Make sure you copied the entire key (starts with `sk-ant-`)
3. Check for extra spaces or characters
4. Clear your browser's LocalStorage and re-enter the key:
   - Open browser DevTools (F12)
   - Go to Application > LocalStorage
   - Delete `claude_api_key`
   - Refresh and re-enter your key

### Dependencies Won't Install

**Problem:** `npm install` fails.

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

## Server Details

### What the Server Does

1. **Serves static files** - HTML, CSS, JavaScript
2. **Proxies Claude API requests** - Forwards your requests to Claude's API
3. **Handles CORS** - Allows your browser to make API calls
4. **Keeps your API key secure** - Key is only in your browser, not on the server

### Server Endpoints

- `GET /` - Serves the main application
- `POST /api/claude` - Proxy for Claude API requests
- `GET /*` - Serves static files (CSS, JS, etc.)

### Server Configuration

Edit `server.js` to customize:

```javascript
const PORT = process.env.PORT || 3000;  // Change default port
```

Or set via environment variable:
```bash
PORT=8080 npm start
```

## Production Deployment

For deploying to production (optional):

1. **Environment variables:**
   ```bash
   export PORT=80
   export NODE_ENV=production
   ```

2. **Use a process manager:**
   ```bash
   npm install -g pm2
   pm2 start server.js --name hierarchical-app-generator
   ```

3. **Security considerations:**
   - Users provide their own API keys
   - Keys are stored client-side only
   - Consider adding rate limiting
   - Use HTTPS in production

## Development Mode

For development with auto-restart:

```bash
# Install nodemon
npm install -g nodemon

# Run with nodemon
nodemon server.js
```

## Getting Help

If you continue to have issues:

1. Check the browser console (F12 > Console) for errors
2. Check the server terminal output for errors
3. Verify Node.js version: `node --version` (should be 14+)
4. Verify npm version: `npm --version`
5. Try restarting your computer (clears port conflicts)

## Next Steps

Once everything is running:

1. Read the [README.md](README.md) for usage instructions
2. Try creating your first hierarchical app
3. Experiment with AI-generated nodes
4. Explore the code editor features

Happy building! 🚀
