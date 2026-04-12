const askAI = require("../ai/askAi");
const formatResponse = require("../utils/formatter");
const ora = require("ora");
const { exec } = require("child_process");
const isDangerous = require("../utils/safety");
const confirmExecution = require("../utils/conformation");
const { resolveWithHybrid, isInvalidAiResponse, sanitizeAiCommand } = require("../utils/intentRouter");


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
    - Prefer safe, common Linux commands
    - Never output shutdown/reboot/rm -rf/mkfs/dd unless user explicitly asked
    
    Query: ${query}
    `;
    
        const aiResult = (await askAI(prompt)).trim();
        const { command: result, source, intent } = resolveWithHybrid(query, aiResult, {
            isInvalidResponse: isInvalidAiResponse,
            sanitizeCommand: sanitizeAiCommand
        });
        if (!result) {
            spinner.stop();
            console.log("❌ Unable to generate a reliable command right now. Please try again.");
            return;
        }

        spinner.stop();
        formatResponse("Generated Command", result.trim());
        if (source === "cache") {
            console.log("⚡ Served from cache for instant response.");
        } else if (source === "local") {
            console.log("ℹ️ Used local intent handler for faster response.");
        } else if (source === "fallback") {
            console.log("ℹ️ Used local fallback because AI was unavailable.");
        }

        if(options.copy){
            const clipboard = (await import("clipboardy")).default;
            clipboard.writeSync(result);
            console.log("📋 Command copied to clipboard!");
        }

        if(options.run){
            if(isDangerous(result)){
                console.log("❌ Dangerous command blocked!");
                return;
            }
            if (typeof confirmExecution !== "function") {
                console.log("❌ Execution confirmation is not configured correctly.");
                return;
            }

            const confirm = await confirmExecution(result);
            if(!confirm) return;
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