const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getCacheResponse, setCachedResponse } = require("../utils/cache");

require("dotenv").config();

const AI_FAILURE_MESSAGE = "Failed to get response from AI";

const TIMEOUT_MS = Number(process.env.PSHELL_AI_TIMEOUT_MS) || 45_000;
const MAX_RETRIES = Math.max(1, Number(process.env.PSHELL_AI_MAX_RETRIES) || 3);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function isFailurePayload(text) {
    const value = String(text || "").trim().toLowerCase();
    return !value || value.includes("failed to get response from ai");
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, ms) {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("PSHELL_AI_TIMEOUT")), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

function isRetryableError(error) {
    if (!error) return false;
    const status = error.status ?? error.statusCode ?? error.code;
    if (status === 429 || status === 503) return true;
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("429") || msg.includes("503")) return true;
    if (msg.includes("resource exhausted") || msg.includes("unavailable") || msg.includes("overload")) {
        return true;
    }
    if (msg.includes("econnreset") || msg.includes("etimedout") || msg.includes("pshell_ai_timeout")) {
        return true;
    }
    return false;
}

async function generateOnce(model, prompt) {
    const result = await withTimeout(model.generateContent(prompt), TIMEOUT_MS);
    const text = result.response.text();
    if (typeof text !== "string" || !String(text).trim()) {
        throw new Error("Empty AI response");
    }
    return text;
}

async function askAi(prompt) {
    const cached = getCacheResponse(prompt);
    if (cached !== undefined && !isFailurePayload(cached)) {
        if (process.env.PSHELL_CACHE_LOG) {
            console.error("[pshell] served from cache");
        }
        return cached;
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let lastError;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const text = await generateOnce(model, prompt);
                setCachedResponse(prompt, text);
                return text;
            } catch (error) {
                lastError = error;
                const retry = isRetryableError(error) && attempt < MAX_RETRIES - 1;
                if (retry) {
                    await sleep(500 * 2 ** attempt);
                    continue;
                }
                break;
            }
        }

        console.error("error in askAi", lastError);
        return AI_FAILURE_MESSAGE;
    } catch (error) {
        console.error("error in askAi", error);
        return AI_FAILURE_MESSAGE;
    }
}

module.exports = askAi;
module.exports.AI_FAILURE_MESSAGE = AI_FAILURE_MESSAGE;
