
const { GoogleGenerativeAI } = require("@google/generative-ai");
const AIProvider = require("./AIProvider");

class GeminiProvider extends AIProvider {
    constructor() {
        super('gemini');
        this.apiKey = process.env.GEMINI_API_KEY;
        this.model = process.env.SHELLBUDDY_GEMINI_MODEL || 'gemini-2.5-flash';
        this.timeoutMs = Number(process.env.SHELLBUDDY_AI_TIMEOUT_MS) || 45000;
        this.maxRetries = Math.max(1, Number(process.env.SHELLBUDDY_AI_MAX_RETRIES) || 3);
        
        if (this.apiKey) {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
        }
    }

    async checkAvailability(){
        this.available = !!this.apiKey;
        return this.available;
    }
    async generate(prompt){
        const startTime = Date.now();
        if(!this.genAI){
            throw new Error("GEMINI_API_KEY not configured");
        }

        const model = this.genAI.getGenerativeModel({model: this.model});

        let lastError;
        for(let attempt = 0; attempt<this.maxRetries; attempt++){
            try {
                const result = await this.withTimeout(
                    model.generateContent(prompt),
                    this.timeoutMs
                );

                const text = result.response.text();

                if(!text || !text.trim()){
                    throw new Error('Empty response');
                }

                return {
                    text: text.trim(),
                    provider:this.name,
                    latencyMs: Date.now()-startTime
                };
            } catch (error) {
                lastError  = error;
                if(this.isRetryable(error) && attempt < this.maxRetries-1){
                    await this.sleep(500*Math.pow(2, attempt));
                    continue;
                }
                break;
            }
        }
        throw lastError;
    }

    withTimeout(promise, ms){
        let timer;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
        });
        return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
    }
    isRetryable(error) {
        const status = error.status ?? error.statusCode;
        if ([429, 503, 500].includes(status)) return true;
        const msg = error.message?.toLowerCase();
        return msg?.includes('resource exhausted') || 
               msg?.includes('unavailable') || 
               msg?.includes('timeout');
    }

    sleep(ms){
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = GeminiProvider;