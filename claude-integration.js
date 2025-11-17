/**
 * Claude API Integration
 * Handles AI-powered node generation
 */

class ClaudeIntegration {
    constructor() {
        this.apiKey = null;
        this.apiEndpoint = 'https://api.anthropic.com/v1/messages';
        this.proxyEndpoint = '/api/claude'; // Local proxy endpoint
        this.useProxy = true; // Use proxy by default to avoid CORS
        this.model = 'claude-3-5-sonnet-20241022';
    }

    // Set API key
    setApiKey(key) {
        this.apiKey = key;
        // Store in localStorage for convenience (note: not most secure)
        if (key) {
            localStorage.setItem('claude_api_key', key);
        } else {
            localStorage.removeItem('claude_api_key');
        }
    }

    // Load API key from localStorage
    loadApiKey() {
        const key = localStorage.getItem('claude_api_key');
        if (key) {
            this.apiKey = key;
        }
        return key;
    }

    // Check if API key is configured
    isConfigured() {
        return !!this.apiKey;
    }

    // Generate child nodes based on parent context
    async generateChildNodes(parentNode, additionalContext = '') {
        if (!this.isConfigured()) {
            throw new Error('Claude API key not configured');
        }

        const prompt = this.buildPrompt(parentNode, additionalContext);

        try {
            let response;

            if (this.useProxy) {
                // Use local proxy to avoid CORS issues
                response = await fetch(this.proxyEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        apiKey: this.apiKey,
                        model: this.model,
                        max_tokens: 1024,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }]
                    })
                });
            } else {
                // Direct API call (will fail in browser due to CORS)
                response = await fetch(this.apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: this.model,
                        max_tokens: 1024,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }]
                    })
                });
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));

                // Provide helpful error messages
                if (response.status === 404) {
                    throw new Error('Proxy server not running. Please start the server with: npm start');
                } else if (response.status === 401) {
                    throw new Error('Invalid API key. Please check your Claude API key.');
                } else if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please wait a moment and try again.');
                } else {
                    throw new Error(error.error?.message || `API request failed (${response.status})`);
                }
            }

            const data = await response.json();
            const content = data.content[0].text;

            return this.parseResponse(content, parentNode.type);

        } catch (error) {
            console.error('Claude API error:', error);

            // Provide more specific error messages
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Cannot connect to server. Make sure to run: npm start');
            }

            throw error;
        }
    }

    // Build prompt for node generation
    buildPrompt(parentNode, additionalContext) {
        const nodeTypeContext = this.getNodeTypeContext(parentNode.type);

        return `You are helping to design a hierarchical application structure. The current node is:

Name: ${parentNode.name}
Type: ${parentNode.type}
${parentNode.metadata.description ? `Description: ${parentNode.metadata.description}` : ''}

${nodeTypeContext}

${additionalContext ? `Additional context: ${additionalContext}\n` : ''}

Generate 3-7 child nodes that would logically break down this component. Return ONLY a JSON array with this structure:

[
  {
    "name": "Node Name",
    "type": "process|logic|code",
    "description": "Brief description"
  }
]

Rules:
- Use descriptive, business-focused names
- Each node should represent a distinct component or process
- Choose appropriate types: "process" for business processes, "logic" for decision/workflow logic, "code" for implementable units
- Keep descriptions concise (1-2 sentences)

Return only the JSON array, no additional text.`;
    }

    // Get context based on node type
    getNodeTypeContext(nodeType) {
        const contexts = {
            domain: 'This is a domain-level node. Generate high-level business process nodes that represent major functional areas.',
            process: 'This is a process node. Generate sub-processes or logical workflow steps.',
            logic: 'This is a logic node. Generate decision points, conditions, or data transformation steps.',
            code: 'This is a code-level node. Generate specific functions or methods to implement.'
        };

        return contexts[nodeType] || contexts.domain;
    }

    // Parse Claude's response
    parseResponse(responseText, parentType) {
        try {
            // Extract JSON from response (handle potential markdown code blocks)
            let jsonText = responseText.trim();

            // Remove markdown code blocks if present
            if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
            }

            const nodes = JSON.parse(jsonText);

            if (!Array.isArray(nodes)) {
                throw new Error('Response is not an array');
            }

            // Validate and normalize nodes
            return nodes.map(node => ({
                name: node.name || 'Unnamed Node',
                type: this.validateNodeType(node.type, parentType),
                description: node.description || ''
            }));

        } catch (error) {
            console.error('Failed to parse Claude response:', error);
            throw new Error('Failed to parse AI response. Please try again.');
        }
    }

    // Validate node type based on parent type
    validateNodeType(type, parentType) {
        const validTypes = ['domain', 'process', 'logic', 'code'];

        if (!validTypes.includes(type)) {
            // Default based on parent
            const defaults = {
                domain: 'process',
                process: 'logic',
                logic: 'code',
                code: 'code'
            };
            return defaults[parentType] || 'process';
        }

        return type;
    }

    // Prompt user for API key if not configured
    async promptForApiKey() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div id="modal-content">
                    <h3>Configure Claude API</h3>
                    <div id="modal-body">
                        <p style="margin-bottom: 15px; color: #999;">
                            Enter your Claude API key to enable AI-powered node generation.
                            Get your key from: <a href="https://console.anthropic.com/" target="_blank" style="color: #4a9eff;">console.anthropic.com</a>
                        </p>
                        <label for="api-key-input">API Key:</label>
                        <input type="password" id="api-key-input" placeholder="sk-ant-...">
                    </div>
                    <div id="modal-actions">
                        <button id="btn-modal-cancel">Cancel</button>
                        <button id="btn-modal-confirm">Save</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const input = modal.querySelector('#api-key-input');
            const cancelBtn = modal.querySelector('#btn-modal-cancel');
            const confirmBtn = modal.querySelector('#btn-modal-confirm');

            const close = (result) => {
                modal.remove();
                resolve(result);
            };

            cancelBtn.onclick = () => close(null);
            confirmBtn.onclick = () => {
                const key = input.value.trim();
                if (key) {
                    this.setApiKey(key);
                    close(key);
                }
            };

            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    confirmBtn.click();
                }
            });

            input.focus();
        });
    }
}
