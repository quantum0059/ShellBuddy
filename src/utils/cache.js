const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");

const CACHE_FILE = path.join(os.homedir(), ".pshell-ai-cache.json");

function cacheKey(prompt) {
    return crypto.createHash("sha256").update(prompt, "utf8").digest("hex");
}

function getCache(){
    if(!fs.existsSync(CACHE_FILE)) return {};
    try {
        const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
        if (data === null || typeof data !== "object" || Array.isArray(data)) return {};
        return data;
    } catch {
        return {};
    }
}

function saveCache(cache){
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function getCacheResponse(prompt){
    const cache = getCache();
    const id = cacheKey(prompt);
    if (!Object.hasOwn(cache, id)) return undefined;
    return cache[id];
}

function setCachedResponse(prompt, value){
    const cache = getCache();
    cache[cacheKey(prompt)] = value;
    saveCache(cache);
}

module.exports = {getCacheResponse, setCachedResponse};