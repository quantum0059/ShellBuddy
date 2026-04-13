/**
 * AI Provider Interface
 * All AI providers must implement this interface
 */

class AIProvider {
    constructor(name) {
        this.name = name;
        this.available = false;
    }

    /**
     * Check if provider is available
     * @returns {Promise<boolean>}
     */
    async checkAvailability() {
        throw new Error('checkAvailability must be implemented');
    }

    /**
     * Generate response from prompt
     * @param {string} prompt 
     * @returns {Promise<{text: string, provider: string, latencyMs: number}>}
     */
    async generate(prompt) {
        throw new Error('generate must be implemented');
    }
}

module.exports = AIProvider;
