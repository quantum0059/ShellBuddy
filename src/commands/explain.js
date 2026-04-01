const askAI = require("../ai/askAi");
const ora = require("ora");
const chalk = require("chalk");
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