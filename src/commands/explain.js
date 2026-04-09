const askAI = require("../ai/askAi");
const ora = require("ora");
const formatResponse = require("../utils/formatter");

async function explain(query){
    const spinner = ora("Explaining command...").start();
    try {
        const prompt = `
        You are a terminal expert.
        
        Explain this command clearly:
        - What it does
        - Breakdown
        - Example

        Output format (strict):
        What it does: <short explanation>
        Breakdown: <flags and parts in simple terms>
        Example: <one practical example>
        
        Command: ${query}
        `;
        const result  = await askAI(prompt);
    
        spinner.stop();
    
        formatResponse("Command Explanation", result);
    } catch (error) {
        spinner.stop();
        console.error("Error in explaining command", error);
    }
}
module.exports = explain;