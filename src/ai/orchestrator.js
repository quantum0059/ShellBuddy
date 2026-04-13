const GeminiProvider = require('./providers/gemini');
const OllamaProvider = require('./providers/ollama');
const { getCacheResponse, setCachedResponse } = require('../utils/cache');

class AIOrchestrator {
    constructor() {
        this.providers = [];
        this.backend = process.env.SHELLBUDDY_AI_BACKEND || 'auto';
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        this.providers = [];

        if (this.backend === 'auto' || this.backend === 'gemini') {
            const gemini = new GeminiProvider();
            await gemini.checkAvailability();
            if (gemini.available) this.providers.push(gemini);
        }

        if (this.backend === 'auto' || this.backend === 'ollama' || this.backend === 'local') {
            const ollama = new OllamaProvider();
            await ollama.checkAvailability();
            if (ollama.available) this.providers.push(ollama);
        }

        this.initialized = true;
    }

    async generate(prompt) {
        await this.initialize();

        // Check cache first
        const cached = getCacheResponse(prompt);
        if (cached && !this.isFailureMessage(cached)) {
            return {
                text: cached,
                provider: 'cache',
                latencyMs: 0
            };
        }

        // Try each provider in order
        for (const provider of this.providers) {
            try {
                const result = await provider.generate(prompt);
                
                // Cache successful response
                setCachedResponse(prompt, result.text);
                
                return result;
            } catch (error) {
                console.error(`[AI] ${provider.name} failed:`, error.message);
                continue;
            }
        }

        throw new Error('All AI providers failed');
    }

    isFailureMessage(text) {
        const value = String(text || '').trim().toLowerCase();
        return !value || 
               value.includes('failed to get response') ||
               value.includes('error');
    }

    getActiveProvider() {
        return this.providers.length > 0 ? this.providers[0].name : 'none';
    }

    getSetupStatus() {
        return {
            backend: this.backend,
            providers: this.providers.map(p => p.name),
            hasAI: this.providers.length > 0
        };
    }
}

module.exports = new AIOrchestrator();