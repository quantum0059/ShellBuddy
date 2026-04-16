const orchestrator = require('./orchestrator');

const AI_FAILURE_MESSAGE = "Failed to get response from AI";

async function askAi(prompt) {
    try {
        const result = await orchestrator.generate(prompt);
        return result.text;
    } catch (error) {
        console.error('[AI] Error:', error.message);
        console.error('[AI] Full error:', JSON.stringify(error, null, 2));
        return AI_FAILURE_MESSAGE;
    }
}

module.exports = askAi;
module.exports.AI_FAILURE_MESSAGE = AI_FAILURE_MESSAGE;
module.exports.orchestrator = orchestrator;