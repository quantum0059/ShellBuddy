/**
 * Intent Router - Hybrid system for routing user queries
 * Detects intent and routes to appropriate handler or falls back to AI
 */

const { getCacheResponse, setCachedResponse } = require("./cache");

// Intent patterns for routing queries
const INTENT_PATTERNS = {
    // History & Search
    history_search: /\b(history|previous|earlier|used|past|recent)\b/i,
    
    // Command Help & Explanation
    command_help: /\b(how.*use|what.*does|explain|meaning|syntax|help)\b/i,
    
    // File Operations
    file_search: /\b(find.*file|search.*file|locate|where.*file|find.*path)\b/i,
    file_permission: /\b(permission|chmod|chown|access.*denied)\b/i,
    
    // Process Management
    process_mgmt: /\b(kill.*process|running.*process|ps|process.*list|stop.*process)\b/i,
    
    // Network
    network_check: /\b(network|ping|connection|ip.*address|dns|curl|wget)\b/i,
    
    // Git Operations
    git_ops: /\b(git.*commit|git.*push|git.*pull|git.*merge|git.*status)\b/i,
    
    // Docker
    docker_ops: /\b(docker|container|image|compose|docker.*run)\b/i,
    
    // Package Management
    package_mgmt: /\b(npm|yarn|pip|install|package|dependency)\b/i,
    
    // Error & Debug
    error_fix: /\b(error|fail|failed|issue|bug|problem|not.*working)\b/i,
    
    // Permission/Sudo
    sudo_needed: /\b(permission.*denied|sudo|root|access.*denied)\b/i,

    //install
    install: /\b(npm|yarn|pip|apt|install)\b/i,
};

/**
 * Detect user intent from query patterns
 * @param {string} query - User query
 * @returns {string} Intent name or 'general' for AI fallback
 */
function detectIntent(query) {
    const q = String(query || "");
    
    for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
        if (pattern.test(q)) {
            return intent;
        }
    }
    
    return 'general';
}

/**
 * Check if query has high confidence for local handling
 * @param {string} query - User query
 * @param {string} intent - Detected intent
 * @returns {boolean}
 */
function hasHighConfidence(query, intent) {
    const q = query.toLowerCase();
    
    // History searches are generally safe and accurate
    if (intent === 'history_search') {
        return q.includes('history') || q.includes('previous');
    }
    
    // Git operations are predictable
    if (intent === 'git_ops') {
        return q.includes('git');
    }
    
    // Process management is straightforward
    if (intent === 'process_mgmt') {
        return q.includes('kill') || q.includes('process');
    }
    
    return false;
}

/**
 * Extract meaningful search terms from query by filtering stop words
 * @param {string} query - User query
 * @returns {string[]} Array of search terms
 */
function extractSearchTerms(query) {
    const stopWords = new Set([
        "find", "show", "get", "give", "me", "my", "the", "a", "an", "of", "to", "for",
        "command", "commands", "related", "about", "from", "in", "on", "with", "that",
        "i", "used", "use", "previous", "earlier", "history", "terminal", "please", "run",
        "any", "wish", "how", "what", "does", "do", "can", "tell"
    ]);

    return query
        .replace(/[^a-z0-9\s-]/g, " ")
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 1 && !stopWords.has(w))
        .slice(0, 4);
}

/**
 * Build history search command from user query
 * @param {string} query - User query
 * @returns {string|null} History search command or null
 */
function buildHistorySearchCommand(query) {
    const terms = extractSearchTerms(query);
    if (!terms.length) return "history";
    return `history | grep -i "${terms.join("|")}"`;
}

/**
 * Build process management command
 * @param {string} query - User query
 * @returns {string|null} Process command or null
 */
function buildProcessCommand(query) {
    const q = query.toLowerCase();
    
    if (q.includes('kill') || q.includes('stop')) {
        const terms = extractSearchTerms(query);
        if (terms.length) {
            return `ps aux | grep ${terms[0]} | grep -v grep`;
        }
        return "ps aux";
    }
    
    if (q.includes('list') || q.includes('running')) {
        return "ps aux";
    }
    
    return null;
}

/**
 * Build git command from query
 * @param {string} query - User query
 * @returns {string|null} Git command or null
 */
function buildGitCommand(query) {
    const q = query.toLowerCase();
    
    if (q.includes('status')) return "git status";
    if (q.includes('log')) return "git log --oneline -10";
    if (q.includes('commit')) return "git commit -m \"your message\"";
    if (q.includes('push')) return "git push origin main";
    if (q.includes('pull')) return "git pull origin main";
    
    return null;
}

/**
 * Build network diagnostic command
 * @param {string} query - User query
 * @returns {string|null} Network command or null
 */
function buildNetworkCommand(query) {
    const q = query.toLowerCase();
    
    if (q.includes('ping')) {
        const terms = extractSearchTerms(query);
        if (terms.length) return `ping -c 4 ${terms[0]}`;
    }
    if (q.includes('ip') || q.includes('address')) return "ip addr show";
    if (q.includes('dns')) return "cat /etc/resolv.conf";
    if (q.includes('connection') || q.includes('network')) return "nmcli device status";
    
    return null;
}

/**
 * Get local handler for intent
 * @param {string} intent - Detected intent
 * @returns {Function|null} Handler function or null
 */
function getLocalHandler(intent) {
    const handlers = {
        history_search: buildHistorySearchCommand,
        process_mgmt: buildProcessCommand,
        git_ops: buildGitCommand,
        network_check: buildNetworkCommand,
    };
    
    return handlers[intent] || null;
}

/**
 * Resolve without calling the network: query cache, high-confidence local handlers,
 * then history-search fallback when intent matches.
 */
function tryResolveWithoutAi(query, { useCache = true } = {}) {
    if (useCache) {
        const cached = getCacheResponse(query);
        if (cached !== undefined) {
            if (process.env.PSHELL_CACHE_LOG) {
                console.error("[pshell] served from cache");
            }
            return { command: cached, source: "cache", intent: detectIntent(query) };
        }
    }

    const intent = detectIntent(query);

    const handler = getLocalHandler(intent);
    if (handler && hasHighConfidence(query, intent)) {
        const localCommand = handler(query);
        if (localCommand) {
            if (useCache) {
                setCachedResponse(query, localCommand);
            }
            return { command: localCommand, source: "local", intent };
        }
    }

    if (intent === "history_search") {
        const fallback = buildHistorySearchCommand(query);
        if (fallback) {
            if (useCache) {
                setCachedResponse(query, fallback);
            }
            return { command: fallback, source: "fallback", intent };
        }
    }

    return { command: null, source: "none", intent };
}

/**
 * After AI returns: use sanitized AI command, or history fallback if applicable.
 */
function finalizeWithAi(query, aiResult, { isInvalidResponse, sanitizeCommand, useCache = true } = {}) {
    const intent = detectIntent(query);

    if (aiResult) {
        const sanitized = sanitizeCommand ? sanitizeCommand(aiResult) : aiResult.trim();
        const isInvalid = isInvalidResponse ? isInvalidResponse(aiResult) : false;

        if (sanitized && !isInvalid) {
            if (useCache) {
                setCachedResponse(query, sanitized);
            }
            return { command: sanitized, source: "ai", intent };
        }
    }

    if (intent === "history_search") {
        const fallback = buildHistorySearchCommand(query);
        if (fallback) {
            if (useCache) {
                setCachedResponse(query, fallback);
            }
            return { command: fallback, source: "fallback", intent };
        }
    }

    return { command: null, source: "none", intent };
}

/**
 * Single-call resolver: pre-AI path first, then AI + finalize (for tests or other callers).
 */
function resolveWithHybrid(query, aiResult, options = {}) {
    const pre = tryResolveWithoutAi(query, { useCache: options.useCache });
    if (pre.command) {
        return pre;
    }
    return finalizeWithAi(query, aiResult, options);
}

/**
 * Check if AI response is invalid
 * @param {string} text - AI response
 * @returns {boolean}
 */
function isInvalidAiResponse(text) {
    const value = String(text || "").trim().toLowerCase();
    return !value || value.includes("failed to get response from ai");
}

/**
 * Sanitize AI command output
 * @param {string} value - AI response
 * @returns {string|null}
 */
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

module.exports = {
    detectIntent,
    hasHighConfidence,
    extractSearchTerms,
    buildHistorySearchCommand,
    buildProcessCommand,
    buildGitCommand,
    buildNetworkCommand,
    getLocalHandler,
    tryResolveWithoutAi,
    finalizeWithAi,
    resolveWithHybrid,
    isInvalidAiResponse,
    sanitizeAiCommand,
    INTENT_PATTERNS
};
