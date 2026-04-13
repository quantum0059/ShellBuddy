const askAI = require("../ai/askAi");
const ora = require("ora");
const chalk = require("chalk");
const formatResponse = require("../utils/formatter");
const { detectIntent, isInvalidAiResponse } = require("../utils/intentRouter");
const { getCacheResponse, setCachedResponse } = require("../utils/cache");

async function explain(query){
    const spinner = ora("Explaining command...").start();
    
    try {
        // Check cache first (skip stale AI failure strings)
        const cached = getCacheResponse(query);
        if (cached !== undefined && !isInvalidAiResponse(cached)) {
            spinner.stop();
            formatResponse("Command Explanation", cached);
            if (process.env.PSHELL_CACHE_LOG) {
                console.log("⚡ Served from cache for instant response.");
            }
            return;
        }
        
        // Check if we can provide a local explanation first
        const intent = detectIntent(query);
        const localExplanation = getLocalExplanation(query, intent);
        
        if (localExplanation && isSimpleCommand(query)) {
            spinner.stop();
            formatResponse("Command Explanation", localExplanation);
            setCachedResponse(query, localExplanation);
            console.log("ℹ️ Used local explanation for faster response.");
            return;
        }
        
        // Fall back to AI for complex explanations
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
        const result = await askAI(prompt);

        spinner.stop();

        if (isInvalidAiResponse(result)) {
            console.log();
            console.log(chalk.yellow.bold("• AI unavailable"));
            console.log(
                chalk.white(
                    "Cloud AI did not return an explanation (network, rate limit, or downtime). Check GEMINI_API_KEY and try again shortly."
                )
            );
            const hint = manHintForQuery(query);
            console.log(chalk.cyan.bold("• Offline help"));
            console.log(chalk.white(hint));
            console.log();
            return;
        }

        formatResponse("Command Explanation", result);
    } catch (error) {
        spinner.stop();
        console.error("Error in explaining command", error);
    }
}

/**
 * Get local explanation for common commands
 * @param {string} query - Command to explain
 * @param {string} intent - Detected intent
 * @returns {string|null} Explanation or null
 */
function getLocalExplanation(query, intent) {
    const q = query.toLowerCase().trim();
    
    // Common command explanations
    const explanations = {
        'ls': 'What it does: Lists directory contents\nBreakdown: ls [options] [directory]\nExample: ls -la (list all files with details)',
        'ps aux': 'What it does: Shows all running processes\nBreakdown: ps (process status), aux (all users, detailed format)\nExample: ps aux | grep nginx',
        'grep': 'What it does: Searches for patterns in text\nBreakdown: grep [options] pattern [file]\nExample: grep "error" logfile.txt',
        'history': 'What it does: Shows command history\nBreakdown: history [count]\nExample: history | grep git',
        'chmod': 'What it does: Changes file permissions\nBreakdown: chmod [permissions] [file]\nExample: chmod 755 script.sh',
    };
    
    // Check for exact match
    if (explanations[q]) {
        return explanations[q];
    }
    
    // Check for partial matches
    for (const [cmd, explanation] of Object.entries(explanations)) {
        if (q.includes(cmd)) {
            return explanation;
        }
    }
    
    return null;
}

function isSimpleCommand(query) {
    const q = query.toLowerCase().trim();
    const simpleCommands = ['ls', 'ps aux', 'grep', 'history', 'chmod'];
    return simpleCommands.includes(q) || 
           (simpleCommands.some(cmd => q === cmd) && !q.includes('|') && !q.includes('bash'));
}

function manHintForQuery(query) {
    const first = String(query || "")
        .trim()
        .split(/\s+/)[0];
    if (!first || first.includes("|") || first.includes("/")) {
        return "Try: man <command-name>   or   tldr <command-name>   (install tldr if needed)";
    }
    const safe = first.replace(/[^a-zA-Z0-9._-]/g, "");
    if (!safe) {
        return "Try: man <command-name>   or   tldr <command-name>";
    }
    return `Try: man ${safe}   or   tldr ${safe}`;
}

module.exports = explain;