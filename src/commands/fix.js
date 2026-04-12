const askAI = require("../ai/askAi");
const formatResponse = require("../utils/formatter");
const ora = require("ora");
const {getLastCommand} = require("../services/historyService");
const isDangerous = require("../utils/safety");
const { detectIntent, hasHighConfidence, buildHistorySearchCommand, extractSearchTerms } = require("../utils/intentRouter");
const { getCacheResponse, setCachedResponse } = require("../utils/cache");

async function fix(issue){
    const lastCommand = getLastCommand();
    const failedCommand = resolveFailedCommand(issue, lastCommand);
    
    // Check cache first
    const cached = getCacheResponse(issue);
    if (cached !== undefined) {
        formatResponse("Suggested Fix", cached);
        if (process.env.PSHELL_CACHE_LOG) {
            console.log("⚡ Served from cache for instant response.");
        }
        return;
    }
    
    // Try local fixes first for common issues
    const directFix = getDirectFix(failedCommand);
    if (directFix) {
        const fixResponse = `Cause: The command has a syntax/order issue.\nSolution: Use history output on the left side of the pipe and grep on the right side.\nCorrect command: ${directFix}`;
        formatResponse("Suggested Fix", fixResponse);
        setCachedResponse(issue, fixResponse);
        console.log("ℹ️ Used local fix for common issue.");
        return;
    }
    
    // Check for history-related errors
    const intent = detectIntent(issue);
    if (intent === 'history_search' && hasHighConfidence(issue, intent)) {
        const historyFix = buildHistorySearchCommand(issue);
        if (historyFix) {
            const fixResponse = `Cause: You're trying to search command history.\nSolution: Use the history command with grep.\nCorrect command: ${historyFix}`;
            formatResponse("Suggested Fix", fixResponse);
            setCachedResponse(issue, fixResponse);
            console.log("ℹ️ Used local fix for history search.");
            return;
        }
    }
    
    const spinner = ora("Fixing error...").start();
    try {
        const prompt = `
            Fix this terminal error:
            Failed command: ${failedCommand}
            Error output or issue text: ${issue}
    
            Provide:
            - Cause
            - Solution
            - Correct command

            Output format (strict):
            Cause: <why this failed>
            Solution: <steps to resolve>
            Correct command: <single corrected command>

            Critical rules:
            - Keep the same user intent as the failed command.
            - Do not suggest unrelated commands.
            - Never suggest dangerous commands (shutdown/reboot/rm -rf/dd/mkfs) unless they appear in the failed command.
            - If this is a typo/syntax issue, return the nearest valid correction.
            `;
    
        let result = await askAI(prompt);
        result = sanitizeDangerousSuggestion(result, failedCommand);
        
        spinner.stop();
        formatResponse("Suggested Fix", result);
    } catch (err) {
        spinner.stop();
        console.error("Error in fixing error", err);
    }
}

function resolveFailedCommand(issue, lastCommand) {
    const cleanedIssue = String(issue || "").trim();
    const cleanedLast = String(lastCommand || "").trim();

    if (looksLikeCommand(cleanedIssue)) return cleanedIssue;
    if (cleanedLast && !cleanedLast.startsWith("shellbuddy fix")) return cleanedLast;
    return cleanedIssue || "unknown command";
}

function looksLikeCommand(text) {
    if (!text) return false;
    const hasShellSyntax = /[|><=&;$]/.test(text);
    const hasFlag = /\s-\w/.test(text) || /\s--\w+/.test(text);
    const hasCommandWord = /\b(grep|git|ls|cd|cat|history|npm|node|curl|awk|sed|find|mkdir|cp|mv|rm)\b/i.test(text);
    return hasShellSyntax || hasFlag || hasCommandWord;
}

function getDirectFix(commandText) {
    const text = String(commandText || "").trim();
    if (!text) return null;

    if (/^hrep\b/i.test(text)) {
        const replaced = text.replace(/^hrep\b/i, "grep").replace(/-\|/g, "|").trim();
        if (/^grep\s+\|\s+/i.test(replaced) || /^grep\s*\|/i.test(replaced)) {
            const keyword = extractKeyword(replaced) || "github";
            return `history | grep -i "${keyword}"`;
        }
        return replaced;
    }

    if (/^grep\b/i.test(text) && /-\|/.test(text)) {
        const keyword = extractKeyword(text) || "github";
        return `history | grep -i "${keyword}"`;
    }

    return null;
}

function extractKeyword(text) {
    const pieces = String(text).split(/\s+/).filter(Boolean);
    const candidate = pieces[pieces.length - 1];
    if (!candidate || candidate === "|" || candidate.startsWith("-")) return null;
    return candidate.replace(/["']/g, "");
}

function sanitizeDangerousSuggestion(result, failedCommand) {
    const output = String(result || "");
    const failedLower = String(failedCommand || "").toLowerCase();
    const hasDangerInInput = isDangerous(failedLower);
    const lines = output.split("\n");

    const correctedLines = lines.map((line) => {
        if (!/^correct command\s*:/i.test(line)) return line;
        const suggested = line.split(":").slice(1).join(":").trim();
        if (!suggested) return line;

        if (isDangerous(suggested) && !hasDangerInInput) {
            return "Correct command: Unable to suggest safely. Please share exact command and error output.";
        }

        return line;
    });

    return correctedLines.join("\n");
}

module.exports = fix;