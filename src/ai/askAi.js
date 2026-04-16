const orchestrator = require('./orchestrator');

const AI_FAILURE_MESSAGE = "Failed to get response from AI";

async function askAi(prompt) {
    try {
        const result = await orchestrator.generate(prompt);
        return result;
    } catch (error) {
        console.error('[AI] Error:', error.message);
        console.error('[AI] Full error:', JSON.stringify(error, null, 2));
        return { text: AI_FAILURE_MESSAGE, provider: 'none', latencyMs: 0 };
    }
}

module.exports = askAi;
module.exports.AI_FAILURE_MESSAGE = AI_FAILURE_MESSAGE;
module.exports.orchestrator = orchestrator;