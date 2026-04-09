const askAI = require("../ai/askAi");
const formatResponse = require("../utils/formatter");
const ora = require("ora");
const {getLastCommand} = require("../services/historyService");
const isDangerous = require("../utils/safety");

async function fix(issue){
    const lastCommand = getLastCommand();
    const failedCommand = resolveFailedCommand(issue, lastCommand);
    const directFix = getDirectFix(failedCommand);
    const spinner = ora("Fixing error...").start();
    try {
        if (directFix) {
            spinner.stop();
            formatResponse(
                "Suggested Fix",
                `Cause: The command has a syntax/order issue.\nSolution: Use history output on the left side of the pipe and grep on the right side.\nCorrect command: ${directFix}`
            );
            return;
        }

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