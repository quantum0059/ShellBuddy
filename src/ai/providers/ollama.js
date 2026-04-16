const http = require('http');

const AIProvider = require("./AIProvider");
const { hostname } = require('os');

class OllamaProvider extends AIProvider {
    constructor() {
        super('ollama');
        this.baseUrl = process.env.SHELLBUDDY_OLLAMA_URL || 'http://localhost:11434';
        this.model = process.env.SHELLBUDDY_OLLAMA_MODEL || 'codellama:7b';
        this.timeoutMs = Number(process.env.SHELLBUDDY_AI_TIMEOUT_MS) || 30000;
    }

    async checkAvailability(){
        try {
            const response = await this.makeRequest('/api/tags', 'GET');
            const hasModel = response.models?.some(m => m.name === this.model);
            
            if (!hasModel && response.models?.length > 0) {
                const availableModels = response.models.map(m => m.name).join(', ');
                this.errorMessage = `Model '${this.model}' not found. Available models: ${availableModels}. Run: ollama pull ${this.model}`;
            } else if (!response.models || response.models.length === 0) {
                this.errorMessage = `No Ollama models installed. Run: ollama pull ${this.model}`;
            }
            
            this.available = hasModel;
            return this.available;
        } catch (error) {
            if (error.message?.includes('ECONNREFUSED') || error.message?.includes('connect')) {
                this.errorMessage = 'Ollama server not running. Start it with: ollama serve';
            } else {
                this.errorMessage = `Ollama error: ${error.message}`;
            }
            this.available = false;
            return false;
        }
    }

    async generate(prompt){
        const startTime = Date.now();

        const response = await this.makeRequest('/api/generate', 'POST', {
            model: this.model,
            prompt: prompt,
            stream: false
        });

        return {
            text: response.response.trim(),
            provider: this.name,
            latencyMs: Date.now() - startTime
        };
    }

    makeRequest(path, method, body = null){
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const options = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: method,
                headers:{
                    'Content-Type': 'application/json'
                },
                timeout: this.timeoutMs
            };
            
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch {
                        reject(new Error('Invalid JSON response'));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (body) {
                req.write(JSON.stringify(body));
            }
            req.end();
        })
    }
}

module.exports = OllamaProvider;