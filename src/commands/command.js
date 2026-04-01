const askAI = require("../ai/askAi");
const formatResponse = require("../utils/formatter");
const ora = require("ora");

async function commandGen(query){
    const spinner = ora("Generating command...").start();
    try {
        const prompt = `
    You are a Linux expert.
    
    Convert this into a shell command.
    
    Rules:
    - Only output the command
    - No explanation
    - No extra text
    
    Query: ${query}
    `;
    
        const result = await askAI(prompt);
        spinner.stop();
        formatResponse("Generated Command", result.trim());
    } catch (error) {
        stop.stop();
        console.error("Error in generating command", error);
    }
}

module.exports = commandGen;