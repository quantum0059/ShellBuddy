const GeminiProvider = require('./providers/gemini');
const OllamaProvider = require('./providers/ollama');
const { getCacheResponse, setCachedResponse } = require('../utils/cache');

class AIOrchestrator {
    constructor() {
        this.providers = [];
        this.backend = process.env.SHELLBUDDY_AI_BACKEND || 'auto';
        this.initialized = false;
    }

    async initialize(forceRefresh = false) {
        if (this.initialized && !forceRefresh) return;

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

        console.error('[AI Orchestrator] Backend:', this.backend);
        console.error('[AI Orchestrator] Providers available:', this.providers.map(p => p.name));

        // If nothing was available during initial detection, re-check once.
        if (this.providers.length === 0) {
            console.error('[AI Orchestrator] No providers available, re-initializing...');
            await this.initialize(true);
            console.error('[AI Orchestrator] After re-init, providers:', this.providers.map(p => p.name));
        }

        if (this.providers.length === 0) {
            throw new Error('No AI providers configured. Set GEMINI_API_KEY in .env or install Ollama.');
        }

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
                console.error(`[AI Orchestrator] Trying provider: ${provider.name}`);
                const result = await provider.generate(prompt);
                
                // Cache successful response
                setCachedResponse(prompt, result.text);
                
                return result;
            } catch (error) {
                console.error(`[AI Orchestrator] ${provider.name} failed:`, error.message);
                console.error(`[AI Orchestrator] ${provider.name} error status:`, error.status || error.statusCode || 'N/A');
                console.error(`[AI Orchestrator] ${provider.name} full error:`, error);
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