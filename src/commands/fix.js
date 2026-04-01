const askAI = require("../ai/askAi");
const formatResponse = require("../utils/formatter");
const ora = require("ora");

async function fix(error){
    const spinner = ora("fixing error...").start();
    try {
        const prompt = `
            Fix this terminal error:
    
            Error: ${error}
    
            Provide:
            - Cause
            - Solution
            - Correct command
            `;
    
        const result = await askAI(prompt);
        
        spinner.stop();
        formatResponse("SuggestedFix", result);
    } catch (error) {
        spinner.stop();
        console.error("Error in fixing error", error);
    }
}

module.exports = fix;