const askAI = require("../ai/askAi");
const formatResponse = require("../utils/formatter");
const ora = require("ora");
const { exec } = require("child_process");
async function commandGen(query, options){
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
    
        const result = (await askAI(prompt)).trim();
        spinner.stop();
        formatResponse("Generated Command", result.trim());

        if(options.copy){
            const clipboard = (await import("clipboardy")).default;
            clipboard.writeSync(result);
            console.log("📋 Command copied to clipboard!");
        }

        if(options.run){
            console.log("\n⚠️ Running AI-generated command...\n");

            exec(result, (error, stdout, stderr) => {
                if(error){
                    console.log("❌ Error:", error.message);
                }
                console.log(stdout || stderr);
            })
        }
    } catch (error) {
        spinner.stop();
        console.error("Error in generating command", error);
    }
}

module.exports = commandGen;