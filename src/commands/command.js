const askAI = require("../ai/askAi");
const formatResponse = require("../utils/formatter");
const ora = require("ora");
const { exec } = require("child_process");
const  isDangerous  = require("../utils/safety");
const confirmExecution = require("../utils/conformation");


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
        const { command: result, source } = resolveCommand(query, aiResult);
        if (!result) {
            spinner.stop();
            console.log("❌ Unable to generate a reliable command right now. Please try again.");
            return;
        }

        spinner.stop();
        formatResponse("Generated Command", result.trim());
        if (source === "fallback") {
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

function resolveCommand(query, aiResult) {
    const directHistoryCommand = buildHistorySearchCommand(query);
    if (directHistoryCommand) {
        return { command: directHistoryCommand, source: "fallback" };
    }

    const fallback = fallbackCommandFromQuery(query);
    if (isInvalidAiResponse(aiResult)) {
        return fallback ? { command: fallback, source: "fallback" } : { command: null, source: "none" };
    }
    const sanitizedAi = sanitizeAiCommand(aiResult);
    if (!sanitizedAi) {
        return fallback ? { command: fallback, source: "fallback" } : { command: null, source: "none" };
    }
    return { command: sanitizedAi, source: "ai" };
}

function isInvalidAiResponse(text) {
    const value = String(text || "").trim().toLowerCase();
    return !value || value.includes("failed to get response from ai");
}

function fallbackCommandFromQuery(query) {
    const q = String(query || "").toLowerCase();
    const wantsHistory = q.includes("history") || q.includes("previous") || q.includes("earlier") || q.includes("used");

    if (wantsHistory) {
        const terms = extractSearchTerms(q);
        if (!terms.length) return "history";
        return `history | grep -i "${terms.join("|")}"`;
    }

    return null;
}

function buildHistorySearchCommand(query) {
    const q = String(query || "").toLowerCase();
    const wantsHistory = q.includes("history") || q.includes("previous") || q.includes("earlier") || q.includes("used");
    if (!wantsHistory) return null;

    const terms = extractSearchTerms(q);
    if (!terms.length) return "history";
    return `history | grep -i "${terms.join("|")}"`;
}

function extractSearchTerms(query) {
    const stopWords = new Set([
        "find", "show", "get", "give", "me", "my", "the", "a", "an", "of", "to", "for",
        "command", "commands", "related", "about", "from", "in", "on", "with", "that",
        "i", "used", "use", "previous", "earlier", "history", "terminal", "please", "run",
        "any", "wish"
    ]);

    return query
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 1 && !stopWords.has(w))
        .slice(0, 4);
}

function sanitizeAiCommand(value) {
    const text = String(value || "").trim();
    if (!text) return null;

    const firstLine = text.split("\n").map((line) => line.trim()).find(Boolean);
    if (!firstLine) return null;

    const lower = firstLine.toLowerCase();
    if (lower.includes("failed to get response from ai")) return null;
    if (lower.startsWith("error:")) return null;
    return firstLine;
}

module.exports = commandGen;