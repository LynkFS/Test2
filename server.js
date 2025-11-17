/**
 * Simple Express Server with Claude API Proxy
 * Handles CORS and proxies requests to Claude API
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Claude API proxy endpoint
app.post('/api/claude', async (req, res) => {
    try {
        const { apiKey, messages, model, max_tokens } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model || 'claude-3-5-sonnet-20241022',
                max_tokens: max_tokens || 1024,
                messages: messages
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Claude API error:', data);
            return res.status(response.status).json({
                error: data.error?.message || 'API request failed',
                details: data
            });
        }

        res.json(data);

    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  Hierarchical App Generator Server                         ║
╚════════════════════════════════════════════════════════════╝

🚀 Server running at: http://localhost:${PORT}
📂 Serving files from: ${__dirname}

✅ CORS enabled
✅ Claude API proxy active at /api/claude

Press Ctrl+C to stop the server
`);
});
